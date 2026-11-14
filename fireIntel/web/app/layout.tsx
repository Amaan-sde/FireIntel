import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIREINTEL // Earth Observation Mission Control",
  description: "Satellite-Based Forest Fire Intelligence System for Uttarakhand, India (NASA Space Apps Challenge 2026)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
        />
      </head>
      <body className="bg-[#030712] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}

