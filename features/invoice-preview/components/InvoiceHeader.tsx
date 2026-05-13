/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useImageFailureState, usePreloadedImageFailure } from "@/features/invoice-preview/components/useInvoiceAssetLoadState";
import styles from "@/features/invoice-preview/styles/invoice-preview.module.css";
import type { InvoicePreviewBusiness, InvoicePreviewInvoice, InvoicePreviewTemplate, InvoicePreviewTranslations } from "@/features/invoice-preview/types/invoice-preview.types";
import { resolveInvoiceAsset } from "@/lib/invoice-preview-assets";

interface InvoiceHeaderProps {
  invoice: InvoicePreviewInvoice;
  business: InvoicePreviewBusiness;
  template: InvoicePreviewTemplate;
  translations: InvoicePreviewTranslations;
  assetAuthKey?: string | null;
  showBusinessLogo?: boolean;
  showTitle?: boolean;
}

type HeaderTitleTone = "black" | "white";

interface HeaderStyleResolution {
  mode: "plain" | "color" | "image";
  style: CSSProperties;
  contrastHex: string | null;
  imageUrlForSampling: string | null;
}

function clamp01(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$/.test(raw) && !/^[0-9a-fA-F]{6}$/.test(raw)) {
    return null;
  }
  const full = raw.length === 3 ? raw.split("").map((char) => `${char}${char}`).join("") : raw;
  return `#${full.toUpperCase()}`;
}

function toRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex) || "#000000";
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
}

function getContrastToneFromHex(hex: string): HeaderTitleTone {
  const { r, g, b } = toRgb(hex);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 150 ? "black" : "white";
}

function getSizeAndRepeat(scaleType: InvoicePreviewTemplate["headerBackground"]["imageScaleType"]): {
  size: string;
  repeat: CSSProperties["backgroundRepeat"];
} {
  switch (scaleType) {
    case "FIT":
      return { size: "contain", repeat: "no-repeat" };
    case "STRETCH":
      return { size: "100% 100%", repeat: "no-repeat" };
    case "TILE":
      return { size: "auto", repeat: "repeat" };
    case "CROP":
    default:
      return { size: "cover", repeat: "no-repeat" };
  }
}

function resolveHeaderStyle(
  template: InvoicePreviewTemplate,
  hasLoadFailure: boolean,
  assetAuthKey?: string | null,
): HeaderStyleResolution {
  const header = template.headerBackground;
  const headerImage = resolveInvoiceAsset(header.imageUrl, assetAuthKey);
  const colorHex = normalizeHexColor(header.colorHex);

  if (header.type === "COLOR" && colorHex) {
    return {
      mode: "color",
      style: { background: colorHex },
      contrastHex: colorHex,
      imageUrlForSampling: null,
    };
  }

  if (!hasLoadFailure && header.type === "IMAGE" && headerImage.kind === "resolved" && headerImage.requestUrl) {
    const imageOverlayHex =
      normalizeHexColor(header.imageOverlayHex) || normalizeHexColor(header.themeOverlayHex);
    const overlayAlpha = clamp01(header.overlayAlpha);
    const { size, repeat } = getSizeAndRepeat(header.imageScaleType);

    const layers: string[] = [];
    if (imageOverlayHex && overlayAlpha > 0) {
      layers.push(
        `linear-gradient(${hexToRgba(imageOverlayHex, overlayAlpha)}, ${hexToRgba(imageOverlayHex, overlayAlpha)})`,
      );
    }
    layers.push(`url('${headerImage.requestUrl}')`);

    return {
      mode: "image",
      style: {
        backgroundImage: layers.join(", "),
        backgroundPosition: "center",
        backgroundSize: size,
        backgroundRepeat: repeat,
      },
      contrastHex: imageOverlayHex,
      imageUrlForSampling: headerImage.requestUrl,
    };
  }

  return {
    mode: "plain",
    style: { background: "transparent" },
    contrastHex: null,
    imageUrlForSampling: null,
  };
}

async function sampleImageTone(url: string): Promise<HeaderTitleTone> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "black";

  const sampleWidth = 32;
  const sampleHeight = 32;
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let luminanceSum = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] ?? 0;
    if (alpha === 0) continue;
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    luminanceSum += ((r * 299) + (g * 587) + (b * 114)) / 1000;
    count += 1;
  }

  if (count === 0) return "black";
  const avg = luminanceSum / count;
  return avg >= 150 ? "black" : "white";
}

export default function InvoiceHeader({
  invoice,
  business,
  template,
  translations,
  assetAuthKey = null,
  showBusinessLogo = true,
  showTitle = true,
}: InvoiceHeaderProps) {
  void invoice;
  const logo = resolveInvoiceAsset(business.logoUrl, assetAuthKey);
  const headerImage = resolveInvoiceAsset(template.headerBackground.imageUrl, assetAuthKey);
  const [logoFailed, markLogoFailed] = useImageFailureState(logo.requestUrl);
  const headerImageFailed = usePreloadedImageFailure(
    headerImage.requestUrl,
    template.headerBackground.type === "IMAGE" && headerImage.kind === "resolved",
  );
  const headerStyle = useMemo(
    () => resolveHeaderStyle(template, headerImageFailed, assetAuthKey),
    [assetAuthKey, headerImageFailed, template],
  );
  const [sampledTone, setSampledTone] = useState<HeaderTitleTone>("black");

  useEffect(() => {
    let active = true;

    if (
      headerImageFailed ||
      headerStyle.mode !== "image" ||
      !headerStyle.imageUrlForSampling ||
      headerStyle.contrastHex
    ) {
      return () => {
        active = false;
      };
    }

    void sampleImageTone(headerStyle.imageUrlForSampling)
      .then((tone) => {
        if (!active) return;
        setSampledTone(tone);
      })
      .catch(() => {
        if (!active) return;
        setSampledTone("black");
      });

    return () => {
      active = false;
    };
  }, [headerImageFailed, headerStyle.contrastHex, headerStyle.imageUrlForSampling, headerStyle.mode]);

  const titleTone: HeaderTitleTone = useMemo(() => {
    if (headerStyle.mode === "plain") return "black";
    if (headerStyle.contrastHex) {
      return getContrastToneFromHex(headerStyle.contrastHex);
    }
    if (headerStyle.mode === "image") return sampledTone;
    return "black";
  }, [headerStyle.contrastHex, headerStyle.mode, sampledTone]);

  const titleColor = titleTone === "white" ? "#FFFFFF" : "#000000";

  return (
    <section className={styles.header} style={headerStyle.style}>
      <div>
        {showBusinessLogo ? (
          logo.kind === "resolved" && logo.requestUrl && !logoFailed ? (
            <img
              src={logo.requestUrl}
              alt="Business logo"
              className={styles.headerLogo}
              onError={markLogoFailed}
            />
          ) : logoFailed || logo.kind === "unsynced" ? (
            <div className={styles.unsyncedAssetTag}>Logo not synced</div>
          ) : null
        ) : null}
      </div>
      {showTitle ? (
        <h1 className={styles.headerTitle} style={{ color: titleColor }}>
          {translations.title}
        </h1>
      ) : null}
      {template.headerBackground.type === "IMAGE" && (headerImageFailed || headerImage.kind === "unsynced") ? (
        <span className={styles.unsyncedAssetHeaderNotice}>Header image not synced</span>
      ) : null}
    </section>
  );
}
