import { formatDate, formatDateTime } from "@/lib/format";
import { CurrencyTotalCell } from "./CurrencyTotalCell";
import { revenueBreakdown, usd } from "@/features/user-revenue/format";
import type { RevenueLifetime, WebpanelCurrencyTotal } from "@/lib/types";

interface UserCardProps {
  row: {
    email: string;
    role: string;
    country: string | null;
    invoicesAll: number;
    invoices30: number;
    /** Unpaid invoices past their due date (the backend counts it from the due date, not the status). */
    pastDue: number;
    paymentsAll: number;
    expensesAll: number;
    invoiceTotalsByCurrency?: WebpanelCurrencyTotal[];
    /** undefined while it loads; null when the account has earned nothing (no revenue row). */
    revenue: RevenueLifetime | null | undefined;
    /** A guest that joined an account: its revenue now counts on that account (decision 0182). */
    retired: boolean;
    lastActivityAt: string | null;
    createdAt: string | null;
    appVersions: string[];
  };
  /** The currency picked above the list, if any. */
  totalCurrency?: string;
  onClick: () => void;
}

function RevenueCell({ revenue, retired }: { revenue: RevenueLifetime | null | undefined; retired: boolean }) {
  if (retired) {
    return (
      <span className="users-cell users-cell-number" title="A guest that joined an account: what it earned now counts on that account (decision 0182).">
        moved
      </span>
    );
  }
  if (revenue === undefined) return <span className="users-cell users-cell-number">…</span>;
  if (revenue === null) {
    return (
      <span className="users-cell users-cell-number" title="No ads or premium counted for this account.">
        {usd(0)}
      </span>
    );
  }
  const { money } = revenue;
  return (
    <span className="users-cell users-cell-number users-revenue-cell" title={revenueBreakdown(money, revenue.fromGuestsMicros)}>
      <span>{usd(money.totalMicros)}</span>
      <span className="users-revenue-split">
        ads {usd(money.adMicros)} · prem {usd(money.premiumMicros)}
      </span>
    </span>
  );
}

function compactEmail(email: string, maxLength = 24): string {
  if (email.length <= maxLength) {
    return email;
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 1) {
    return `${email.slice(0, maxLength - 1)}...`;
  }

  const domain = email.slice(atIndex);
  const localLength = Math.max(4, maxLength - domain.length - 3);
  return `${email.slice(0, localLength)}...${domain}`;
}

export default function UserCard({ row, totalCurrency, onClick }: UserCardProps) {
  const normalizedCountry = row.country?.trim().toUpperCase();
  const countryCode = normalizedCountry || undefined;
  const flagUrl =
    countryCode && /^[A-Z]{2}$/.test(countryCode)
      ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
      : undefined;

  return (
    <button type="button" className="users-table-row" onClick={onClick}>
      <span className="users-cell users-cell-email" title={row.email}>
        {compactEmail(row.email)}
      </span>
      <span className="users-cell">{row.role}</span>
      <span className="users-cell">
        {countryCode ? (
          <span className="country-badge" title={countryCode}>
            {flagUrl ? (
              <img
                src={flagUrl}
                alt=""
                className="country-badge-flag-image"
                loading="lazy"
                width={18}
                height={14}
              />
            ) : (
              <span className="country-badge-flag-fallback" aria-hidden="true">-</span>
            )}
            <span className="country-badge-code">{countryCode}</span>
          </span>
        ) : (
          "-"
        )}
      </span>
      <span className="users-cell users-cell-number">{row.invoicesAll}</span>
      <span className="users-cell users-cell-number">{row.invoices30}</span>
      <span className="users-cell users-cell-number">{row.pastDue}</span>
      <span className="users-cell users-cell-number">{row.paymentsAll}</span>
      <span className="users-cell users-cell-number">{row.expensesAll}</span>
      <CurrencyTotalCell byCurrency={row.invoiceTotalsByCurrency} focus={totalCurrency} />
      <RevenueCell revenue={row.revenue} retired={row.retired} />
      <span className="users-cell">{formatDateTime(row.lastActivityAt)}</span>
      <span className="users-cell">{formatDate(row.createdAt)}</span>
      <span className="users-cell" title={row.appVersions.join(", ")}>
        {row.appVersions.length > 0 ? row.appVersions[row.appVersions.length - 1] : "-"}
      </span>
    </button>
  );
}
