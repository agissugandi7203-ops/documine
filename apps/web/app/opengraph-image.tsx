import { renderBrandSocialImage, SOCIAL_IMAGE_SIZE } from "@/lib/og-image-renderer";

export const runtime = "edge";
export const alt = "DocuMind - AI Document Intelligence Workspace";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderBrandSocialImage();
}
