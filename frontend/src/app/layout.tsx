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

const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const storedTheme = localStorage.getItem("theme");
  const theme =
    storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
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
