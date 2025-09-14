import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

export const metadata: Metadata = {
  title: "Smart Picker - Efficient Order Preparation | Barcode Scanning App",
  description: "Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately. Perfect for warehouses and distribution centers.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
