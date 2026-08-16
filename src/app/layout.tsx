import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Instrument_Sans, Sora } from "next/font/google";
import { PreferencesSync } from "@/components/preferences/preferences-sync";
import { SIDEBAR_STORAGE_KEY } from "@/lib/layout/sidebar";
import {
  THEME_RESOLVED_KEY,
  THEME_STORAGE_KEY,
  isDarkFromCookies,
} from "@/lib/theme/theme";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const display = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enigma",
  description:
    "Identify, quantify, and accelerate Agentforce opportunities from the customer's operational reality.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const dark = isDarkFromCookies(
    cookieStore.get(THEME_STORAGE_KEY)?.value,
    cookieStore.get(THEME_RESOLVED_KEY)?.value,
  );
  const sidebar = cookieStore.get(SIDEBAR_STORAGE_KEY)?.value;
  const sidebarClass =
    sidebar === "collapsed"
      ? " sidebar-collapsed"
      : sidebar === "hover"
        ? " sidebar-hover"
        : "";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased${dark ? " dark" : ""}${sidebarClass}`}
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <PreferencesSync />
        {children}
      </body>
    </html>
  );
}
