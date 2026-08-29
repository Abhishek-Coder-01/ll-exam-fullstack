import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LL Exam Portal — License & Learner Exam Management",
  description: "Government licensing and learner exam management dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
