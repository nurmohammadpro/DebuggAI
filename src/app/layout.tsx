import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { ThemeInitScript } from "@/components/theme-init-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeBuggAI - Debug Code & Build Apps with AI",
  description: "Debug any code 10x faster and build production-ready web apps in minutes with AI-powered analysis and code generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInitScript />
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
