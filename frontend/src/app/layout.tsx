import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Web3ContextProvider from "@/context/web3";
import { DisconnectOverlayHost } from "./components/DisconnectOverlayHost";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawChain | Transparent Shelter Donations",
  description:
    "A blockchain-based animal shelter donation platform with verified campaigns, milestone approvals, and smart contract fund release.",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Web3ContextProvider cookies={cookies}>
          {children}
          <DisconnectOverlayHost />
        </Web3ContextProvider>
      </body>
    </html>
  );
}
