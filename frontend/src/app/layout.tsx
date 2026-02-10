import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";
import ThemeInitializer from "./components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Trust - Inicio de Sesión",
  description: "Inicia sesión para gestionar tus mantenimientos.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Poppins:wght@700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeInitializer />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
