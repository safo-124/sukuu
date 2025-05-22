import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sukuu - School Management System",
  description: "Advanced School Management System for modern educational institutions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* For a consistent dark landing page background, ensure 'dark' class is applied if ThemeProvider defaults to system/light */}
      {/* Or apply a dark background directly here if landing page is always dark themed */}
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-slate-50 dark:bg-slate-950 dark:text-slate-50 min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark" // Set dark as default for the landing page aesthetic
          enableSystem={false} // Disable system if you want to force dark/light for landing
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
