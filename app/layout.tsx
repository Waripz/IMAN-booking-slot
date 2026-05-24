import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMAN Booking Slot",
  description: "Tempah slot masa anda untuk acara IMAN | Book your time slot for IMAN event",
  keywords: ["IMAN", "booking", "slot", "tempahan", "event"],
  openGraph: {
    title: "IMAN Booking Slot",
    description: "Tempah slot masa anda untuk acara IMAN",
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
