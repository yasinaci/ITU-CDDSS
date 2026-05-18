import type { Metadata } from "next";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { SharedLayout } from "@/components/SharedLayout";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "ITU CDDSS",
  description: "Campus density and noise decision support system"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <SharedLayout>{children}</SharedLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
