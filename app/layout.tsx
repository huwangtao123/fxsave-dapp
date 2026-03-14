import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { WalletProvider } from "@/fxsave/wallet-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seattle Business Welcome | Smart Welcome",
  description: "Welcome to the Seattle business community. Get personalized recommendations for your new business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
