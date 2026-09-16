import type { Metadata } from "next";
import { Cinzel, Lato, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Cinzel is the closest open face to Friz Quadrata (the Warcraft display
// type); Lato is what the official site uses for body copy.
const display = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const sans = Lato({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
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
    default: "Warcraft 3 Gym: Learn Warcraft III & compete in the GNL",
    template: "%s · Warcraft 3 Gym",
  },
  description:
    "Free Warcraft III guides for every race, plus the Gym Newbie League (GNL): a community team tournament with weekly best-of-three series, standings, leaderboard and fantasy.",
  openGraph: {
    title: "Warcraft 3 Gym",
    description:
      "Learn Warcraft III with free guides, then compete in the Gym Newbie League.",
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
