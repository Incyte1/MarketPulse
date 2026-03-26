export const brand = {
  name: "Unveni",
  shortName: "UNV",
  descriptor: "Research Operating System",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://unveni.com",
  metaTitle: "Unveni | Research Operating System",
  metaDescription:
    "Multi-horizon research operating system for catalyst review, technical structure, execution planning, and source-linked memo workflow.",
  appEyebrow: "Market Intelligence Desk",
  appSummary:
    "Coverage, chart markup, catalyst review, technical structure, workflow memory, and execution context in one operating surface.",
  loginPrompt:
    "Use your Unveni credentials to restore desks, alerts, source-linked memos, and active market context.",
  registerPrompt:
    "Create a persistent Unveni account for a desk-grade workflow backed by the API.",
};

export function brandLabel(label?: string) {
  return label ? `${brand.name} ${label}` : brand.name;
}
