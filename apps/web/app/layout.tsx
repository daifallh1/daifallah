import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Nav } from "@/components/Nav";
import { SwRegister } from "@/components/SwRegister";
import { lb } from "@/lib/data";

export const metadata: Metadata = {
  title: "ITIL Foundation v5 Practice",
  description: "Private ITIL Foundation (Version 5) exam simulator built only from the owner-supplied, audited source PDF.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "ITIL v5 Practice", statusBarStyle: "default" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f8fa" }, { media: "(prefers-color-scheme: dark)", color: "#111418" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <StoreProvider>
          <a href="#main" className="skip">Skip to content</a>
          <Nav />
          <main id="main">{children}</main>
          <footer className="footer">
            <p>{lb.bank.notice}</p>
            <p className="muted small">Bank {lb.bank.bankVersion} · source SHA-256 {lb.bank.sourceDocumentSha256.slice(0, 16)}… · syllabus v{lb.bank.syllabus.version} ({lb.bank.syllabus.published}) used for classification only.</p>
          </footer>
        </StoreProvider>
        <SwRegister />
      </body>
    </html>
  );
}
