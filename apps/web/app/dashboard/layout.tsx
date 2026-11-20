import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-metadata";
import "./dashboard.mobile.css";
import "./chat.css";
import "./analytics.css";
import "./executive-home.css";

export const metadata: Metadata = {
  title: "Workspace Dashboard",
  description:
    "Explore documents, cited AI reasoning, knowledge graphs, SQL analytics, and integrated PDF files in DocuMind.",
  openGraph: {
    title: `Workspace Dashboard | ${SITE_NAME}`,
    description:
      "Explore documents, cited AI reasoning, knowledge graphs, and integrated PDF files in DocuMind.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Workspace Dashboard | ${SITE_NAME}`,
    description:
      "Explore documents, cited AI reasoning, knowledge graphs, and integrated PDF files in DocuMind.",
    images: ["/twitter-image"],
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="db-font-root">{children}</div>;
}
