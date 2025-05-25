"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Navigation from "@/components/Navigation";
import Header from "@/components/Header";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only redirect after auth has been checked and we're on the client
    if (!loading && !isAuthenticated && isClient) {
      console.log("User not authenticated, redirecting to login");
      // Use window.location.href for a hard navigation
      window.location.href = "/login";
    }
  }, [isAuthenticated, loading, isClient]);

  // Show nothing while loading or if not authenticated
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <Header />
      <main className="flex-grow md:ml-64 p-4 md:p-6 pb-20 md:pb-6 mt-12">
        {children}
      </main>
    </div>
  );
}
