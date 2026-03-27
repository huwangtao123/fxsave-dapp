import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";

import { WalletProvider } from "@/fxsave/wallet-provider";

import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FxSafe DApp | fxSAVE on Base",
  description: "Mint and redeem fxSAVE on Base through Enso-powered shortcut bundles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={ibmPlexSans.className}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
