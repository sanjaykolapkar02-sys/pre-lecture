import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pre-Lecture — Teacher-approved context before class",
  description: "A private prototype for teacher-approved, syllabus-grounded pre-class previews with Monad Testnet verification.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
