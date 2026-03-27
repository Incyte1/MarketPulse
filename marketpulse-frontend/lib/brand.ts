export const brand = {
  name: "Unveni",
  shortName: "UNV",
  descriptor: "Market Intelligence",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://unveni.com",
  metaTitle: "Unveni | Institutional Market Review Without Terminal Bloat",
  metaDescription:
    "Premium market intelligence for traders and analysts. Catalyst review, structured risk, and research-grade market context without terminal bloat.",
  appEyebrow: "Institutional Market Review",
  appSummary:
    "High-signal market review across price, catalysts, sentiment, and risk in one calm analytical workspace.",
  loginPrompt:
    "Restore your Unveni workspace, watchlists, memos, and market context from the last active session.",
  registerPrompt:
    "Request access to the Unveni research environment and join the next analyst cohort.",
};

export function brandLabel(label?: string) {
  return label ? `${brand.name} ${label}` : brand.name;
}
