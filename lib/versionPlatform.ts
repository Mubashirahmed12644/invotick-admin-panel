/**
 * The platform part of a version's label: "iOS", "Android", or "Android + iOS".
 *
 * The backend reads it from the sessions that carried the build. An empty list means none did in the
 * window (an old iOS backlog sent before sessions, for example), so the label says "platform unknown"
 * rather than guessing from the number. A missing field means a backend that does not send it yet, and
 * then the label says nothing, so it never claims "unknown" for every version at once.
 */
export function versionPlatform(platforms: string[] | null | undefined): string | null {
  if (platforms == null) return null;
  if (platforms.length === 0) return "platform unknown";
  return platforms.join(" + ");
}

/** Prefixes a version label with its platform: "iOS · 1.4.6 (17)". */
export function withPlatform(label: string, platforms: string[] | null | undefined): string {
  const platform = versionPlatform(platforms);
  return platform ? `${platform} · ${label}` : label;
}
