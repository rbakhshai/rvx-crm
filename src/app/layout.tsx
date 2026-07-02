import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * Rubik — friendly humanist sans. Drives the Pipedrive-flavored
 * look across the whole app. CSS var `--font-rubik` is referenced
 * by `--font-sans` in globals.css.
 */
const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RVX CRM",
  description: "Brokerage operating system for rvparkexchange.com",
  // PWA / iOS home-screen install
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RVX",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0E0B" },
  ],
};

/**
 * Tiny no-flash script: runs before React hydrates, reads the saved
 * theme from localStorage (falling back to system preference), and
 * sets `.dark` on <html> immediately so there's no light→dark flicker.
 */
const THEME_SCRIPT = `
try {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = stored === 'dark' || (!stored && prefersDark);
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT above intentionally adds `.dark`
    // to <html> pre-hydration from per-client localStorage, which the server
    // can't know — so this one element's class is EXPECTED to differ. The
    // suppression is scoped to this element only; child mismatches still warn.
    <html lang="en" className={rubik.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          theme="system"
          toastOptions={{
            style: {
              fontFamily: "var(--font-rubik)",
              fontSize: 13,
            },
          }}
        />
      </body>
    </html>
  );
}
