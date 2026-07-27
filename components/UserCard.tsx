import { formatDate, formatDateTime } from "@/lib/format";
import { CurrencyTotalCell } from "./CurrencyTotalCell";
import type { WebpanelCurrencyTotal } from "@/lib/types";

interface UserCardProps {
  row: {
    email: string;
    role: string;
    country: string | null;
    invoicesAll: number;
    invoices30: number;
    overdue: number;
    paymentsAll: number;
    expensesAll: number;
    invoiceTotalAll: number;
    invoiceTotalsByCurrency?: WebpanelCurrencyTotal[];
    lastActivityAt: string | null;
    createdAt: string | null;
    appVersions: string[];
  };
  onClick: () => void;
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

export default function UserCard({ row, onClick }: UserCardProps) {
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
      <span className="users-cell users-cell-number">{row.overdue}</span>
      <span className="users-cell users-cell-number">{row.paymentsAll}</span>
      <span className="users-cell users-cell-number">{row.expensesAll}</span>
      <CurrencyTotalCell total={row.invoiceTotalAll} byCurrency={row.invoiceTotalsByCurrency} />
      <span className="users-cell">{formatDateTime(row.lastActivityAt)}</span>
      <span className="users-cell">{formatDate(row.createdAt)}</span>
      <span className="users-cell" title={row.appVersions.join(", ")}>
        {row.appVersions.length > 0 ? row.appVersions[row.appVersions.length - 1] : "-"}
      </span>
    </button>
  );
}
