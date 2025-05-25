"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isAuthenticated && pathname === "/login") {
      router.push("/home");
    }
  }, [isAuthenticated, loading, pathname]);

  return <div className="min-h-screen bg-background">{children}</div>;
}
