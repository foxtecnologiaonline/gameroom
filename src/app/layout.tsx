import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Gameroom — Ativos Digitais",
  description: "Marketplace de chaves de jogo, gift cards e assinaturas com entrega automática",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans antialiased">
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
