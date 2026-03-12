import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG to Model Compare",
  description: "Compare RAG implementations with direct model outputs. Analyze performance metrics, costs, and response quality side-by-side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-unkey-black text-white font-sans">
        <div className="min-h-screen">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

// Made with Bob
