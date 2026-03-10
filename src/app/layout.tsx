import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG to Model Compare",
  description: "Compare RAG implementations with model outputs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

// Made with Bob
