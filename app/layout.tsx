import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Galeri Sedekad Teme Abdullah",
  description: "Tempah waktu lawatan anda ke Galeri Sedekad Teme Abdullah | Book your gallery visit",
  keywords: ["Galeri", "Sedekad", "Teme Abdullah", "tempahan", "lawatan"],
  openGraph: {
    title: "Galeri Sedekad Teme Abdullah",
    description: "Tempah waktu lawatan anda ke Galeri Sedekad Teme Abdullah",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body>
        <div className="bg-pattern" />
        {children}
      </body>
    </html>
  );
}
