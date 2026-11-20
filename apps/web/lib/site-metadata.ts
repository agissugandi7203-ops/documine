export const SITE_NAME = "DocuMind";
export const SITE_TITLE = "DocuMind - AI Document Intelligence Workspace";
export const SITE_DESCRIPTION =
  "Tactile AI document workspace for verified PDF and CSV inspection, grounded citations, knowledge graphs, and SQL analytics.";

export function getMetadataBase(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      // Fallback below
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}
