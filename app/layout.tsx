import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PASANKU - Belajar Bahasa Pasan Interaktif",
  description:
    "Bahasa kita, warisan kita. Aplikasi pembelajaran Bahasa Pasan berbasis web dengan microlearning, gamifikasi XP, dan rekomendasi remedial adaptif.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
      </body>
    </html>
  );
}
