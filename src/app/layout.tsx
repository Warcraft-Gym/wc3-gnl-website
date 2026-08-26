import type { Metadata } from "next";
import { Saira, Saira_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Saira_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

const sans = Saira({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://warcraft3.gym"),
  title: {
    default: "Warcraft 3 Gym — The community league for competitive WC3",
    template: "%s · Warcraft 3 Gym",
  },
  description:
    "Warcraft 3 Gym is a community-driven competitive league. Follow the Gym Newbie League — standings, schedule, teams, leaderboard, and fantasy.",
  openGraph: {
    title: "Warcraft 3 Gym",
    description: "The community-driven competitive Warcraft III league.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
