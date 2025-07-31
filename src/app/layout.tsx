import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import UserOnboarding from "@/components/onboarding/UserOnboarding";
import QueryProvider from "@/providers/QueryProvider";
import { CartModalProvider } from "@/providers/CartProvider";
import GlobalCartModal from "@/components/cart/GlobalCartModal";
import DynamicSquareProvider from "@/components/providers/DynamicSquareProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Little Cafe - Fresh Coffee & Pastries",
  description: "Welcome to Little Cafe, where we serve the finest coffee, delicious pastries, and create memorable moments. Visit us for a warm atmosphere and exceptional service.",
  keywords: "cafe, coffee, pastries, breakfast, lunch, coffee shop, Little Cafe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <DynamicSquareProvider>
            <CartModalProvider>
              <div className="min-h-screen bg-white">
                {children}
                <UserOnboarding />
                <GlobalCartModal />
                <Toaster />
              </div>
            </CartModalProvider>
          </DynamicSquareProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
