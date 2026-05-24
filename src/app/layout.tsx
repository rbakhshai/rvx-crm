import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RVX CRM",
  description: "Brokerage operating system for rvparkexchange.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
