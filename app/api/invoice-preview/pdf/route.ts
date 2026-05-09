import puppeteer from "puppeteer-core";
import { saveInvoicePreviewPayload } from "@/lib/invoice-preview-payload-store";
import { INVOICE_PREVIEW_ASSET_TOKEN_COOKIE } from "@/lib/invoice-preview-asset-cookie";
import type { InvoicePreviewDocument } from "@/features/invoice-preview/types/invoice-preview.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrowserInstance = Awaited<ReturnType<typeof puppeteer.launch>>;

const globalPdfBrowser = globalThis as typeof globalThis & {
  __invoicePdfBrowser?: BrowserInstance;
  __invoicePdfBrowserPromise?: Promise<BrowserInstance>;
};

function sanitizeFileName(input: string): string {
  return input.replace(/[\\/:*?"<>|]/g, "_");
}

interface PdfRequestBody {
  filename?: string;
  data?: InvoicePreviewDocument;
  assetAuthKey?: string;
  assetBearerToken?: string;
}

async function getBrowserLaunchOptions() {
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return {
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true as const,
    };
  }

  // Local dev: use puppeteer's own bundled Chrome
  const localPuppeteer = (await import("puppeteer")).default;
  return {
    executablePath: localPuppeteer.executablePath(),
    headless: true as const,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
}

async function getBrowser(): Promise<BrowserInstance> {
  if (globalPdfBrowser.__invoicePdfBrowser?.connected) {
    return globalPdfBrowser.__invoicePdfBrowser;
  }

  if (!globalPdfBrowser.__invoicePdfBrowserPromise) {
    globalPdfBrowser.__invoicePdfBrowserPromise = getBrowserLaunchOptions()
      .then((options) => puppeteer.launch(options))
      .then((browser) => {
        globalPdfBrowser.__invoicePdfBrowser = browser;
        browser.on("disconnected", () => {
          globalPdfBrowser.__invoicePdfBrowser = undefined;
          globalPdfBrowser.__invoicePdfBrowserPromise = undefined;
        });
        return browser;
      });
  }

  return globalPdfBrowser.__invoicePdfBrowserPromise;
}

// Warm the browser once per server process to reduce first-request latency.
void getBrowser();

async function generatePdfResponse(
  request: Request,
  options?: {
    fileName?: string;
    data?: InvoicePreviewDocument;
    assetAuthKey?: string;
    assetBearerToken?: string;
  },
): Promise<Response> {
  let page: Awaited<ReturnType<BrowserInstance["newPage"]>> | null = null;

  try {
    const requestUrl = new URL(request.url);
    const payloadKey = options?.data ? saveInvoicePreviewPayload(options.data) : null;
    const renderPath = payloadKey
      ? `/invoice-preview?pdf=1&payloadKey=${encodeURIComponent(payloadKey)}${
          options?.assetAuthKey ? `&assetAuthKey=${encodeURIComponent(options.assetAuthKey)}` : ""
        }`
      : `/invoice-preview?pdf=1${
          options?.assetAuthKey ? `&assetAuthKey=${encodeURIComponent(options.assetAuthKey)}` : ""
        }`;
    const renderUrl = new URL(renderPath, requestUrl.origin).toString();
    const queryFileName = requestUrl.searchParams.get("filename");
    const fileName = sanitizeFileName(options?.fileName || queryFileName || "invoice-preview");

    const browser = await getBrowser();
    page = await browser.newPage();
    if (options?.assetBearerToken) {
      await page.setCookie({
        name: INVOICE_PREVIEW_ASSET_TOKEN_COOKIE,
        value: encodeURIComponent(options.assetBearerToken),
        url: requestUrl.origin,
        path: "/",
      });
    }
    page.setDefaultNavigationTimeout(10000);
    page.setDefaultTimeout(5000);
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.goto(renderUrl, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForSelector('[data-invoice-page="true"]', { timeout: 5000 });

    // Wait for client-side pagination measurements to settle before PDF capture.
    await page.waitForFunction(
      () => Boolean(document.querySelector('[data-invoice-pagination-ready="1"]')),
      { timeout: 12000 },
    );

    await page.evaluate(async () => {
      function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T | null> {
        return new Promise<T | null>((resolve) => {
          let done = false;
          const timer = window.setTimeout(() => {
            if (!done) {
              done = true;
              resolve(null);
            }
          }, timeoutMs);

          task
            .then((value) => {
              if (done) return;
              done = true;
              window.clearTimeout(timer);
              resolve(value);
            })
            .catch(() => {
              if (done) return;
              done = true;
              window.clearTimeout(timer);
              resolve(null);
            });
        });
      }

      if ("fonts" in document) {
        await withTimeout(document.fonts.ready, 2500);
      }

      // Wait for image assets, but do not block indefinitely.
      await Promise.all(
        Array.from(document.querySelectorAll("img")).map((image) => {
          if (image.complete) return Promise.resolve<void>(undefined);
          return withTimeout(
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
            2500,
          ).then(() => undefined);
        }),
      );

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown PDF generation error";
    return Response.json(
      { error: { code: "PDF_GENERATION_FAILED", message } },
      { status: 500 },
    );
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export async function GET(request: Request): Promise<Response> {
  return generatePdfResponse(request);
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as PdfRequestBody | null;
  return generatePdfResponse(request, {
    fileName: body?.filename,
    data: body?.data,
    assetAuthKey: body?.assetAuthKey,
    assetBearerToken: body?.assetBearerToken,
  });
}
