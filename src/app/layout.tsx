import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { ThemeInitScript } from "@/components/theme-init-script";
import { SupabaseLockHandler } from "@/components/supabase-lock-handler";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeBuggAI - AI Workspace for Debugging and App Building",
  description: "Bring errors, prompts, generated files, preview status, and project history into one focused developer workspace.",
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInitScript />
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            <SupabaseLockHandler />
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
