import type { Metadata } from "next";
import { Bungee, Rubik } from "next/font/google";
import "./globals.css";

const display = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Rubik({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Bored Box — tiny games for restless brains",
  description:
    "A chunky little arcade of simple browser games: Snake, Memory, Tic-Tac-Toe, Reaction, and 2048.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
