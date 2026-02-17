import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "BrainBolt Quiz",
  description: "Adaptive Infinite Quiz Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
