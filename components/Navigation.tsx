"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import { Home, User, Menu, X, UserPlus, CheckSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile on initial render and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up event listener
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const navItems = [
    {
      name: t("nav.home") || "Home",
      href: "/home",
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: t("nav.tasks") || "Tasks",
      href: "/tasks",
      icon: <CheckSquare className="h-6 w-6" />,
    },
    {
      name: t("nav.teams") || "Teams",
      href: "/teams",
      icon: <UserPlus className="h-6 w-6" />,
    },
    {
      name: t("nav.profile") || "Profile",
      href: "/profile",
      icon: <User className="h-6 w-6" />,
    },
  ];

  // Mobile navigation bar (bottom)
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/60 backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-border/50">
        <div
          className="grid h-full"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
        >
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`inline-flex flex-col items-center justify-center px-1 ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Desktop sidebar navigation
  return (
    <>
      {/* Mobile menu button - only visible on smaller screens */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-background p-2 rounded-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar for desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 justify-start h-16 border-b border-border px-6">
            <Image src="/favicon.ico" alt="Logo" width={28} height={28} />
            <h1 className="text-xl font-bold">{t("app.title") || "Insider"}</h1>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-md ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Avatar>
                  <AvatarFallback>
                    {user?.first_name?.[0] || user?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.username}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {user?.position
                    ? typeof user.position === "object"
                      ? (user.position as { name: string }).name
                      : user.position
                    : user?.email || ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
