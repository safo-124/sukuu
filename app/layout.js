// File: app/layout.js
import "./globals.css"; // Your global styles, including Tailwind & shadcn/ui theme variables
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"; // Your theme provider
import AuthProvider from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Sukuu - School Management System",
  description: "Advanced School Management System for modern educational institutions.",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning is crucial for next-themes
    <html lang="en" suppressHydrationWarning> 
      <body 
        className={`${inter.className} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system" // Allows system preference, can also be "light" or "dark"
          enableSystem
          disableTransitionOnChange 
        >
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}