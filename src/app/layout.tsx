import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "EchoTrace — see how a claim changes as it spreads",
  description:
    "Enter a claim and the statements it became. EchoTrace infers which statements came from which, classifies each change, and shows the evidence behind every connection.",
};

export const viewport: Viewport = {
  themeColor: "#070a10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
