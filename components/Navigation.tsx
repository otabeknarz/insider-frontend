"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import { Home, User, Menu, X, UserPlus, CheckSquare, CheckCircle, Archive } from "lucide-react";
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
      subItems: [
        {
          name: t("nav.activeTasks") || "Active",
          href: "/tasks",
          icon: <CheckCircle className="h-5 w-5" />,
        },
        {
          name: t("nav.archivedTasks") || "Archived",
          href: "/tasks/archived",
          icon: <Archive className="h-5 w-5" />,
        },
      ],
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
    // For mobile, flatten the navigation structure to include subnav items
    const flatNavItems = navItems.flatMap(item => {
      // If we're on a tasks page and this is the tasks nav item, show the subnav items instead
      if (item.subItems && pathname.startsWith('/tasks') && item.href === '/tasks') {
        return item.subItems;
      }
      // Otherwise just return the main nav item
      return item;
    });
    
    return (
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/80 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-border/30">
        <div
          className="grid h-full max-w-screen-lg mx-auto"
          style={{ gridTemplateColumns: `repeat(${flatNavItems.length}, 1fr)` }}
        >
          {flatNavItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`inline-flex flex-col items-center justify-center px-1 transition-all duration-200 ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-primary hover:scale-105"
              }`}
            >
              <div className={`p-1.5 rounded-full ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-primary/10" : ""}`}>
                {item.icon}
              </div>
              <span className="text-xs font-medium mt-1">{item.name}</span>
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
        className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-md p-2.5 rounded-full shadow-sm border border-border/30 transition-all duration-200 hover:bg-muted"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5 text-primary" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Sidebar for desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-background/95 backdrop-blur-md border-r border-border/50 shadow-lg md:shadow-none transform transition-all duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 justify-start h-16 border-b border-border/50 px-6">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Image src="/favicon.ico" alt="Logo" width={24} height={24} className="rounded" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              {t("app.title") || "Insider"}
            </h1>
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {navItems.map((item) => (
              <div key={item.name} className="space-y-1 group">
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    (pathname === item.href || pathname.startsWith(`${item.href}/`)) && (!item.subItems || item.subItems.length === 0)
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:shadow-sm"
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-primary/10" : "bg-muted/50 group-hover:bg-muted"}`}>
                    {item.icon}
                  </div>
                  <span className="ml-3 font-medium">{item.name}</span>
                </Link>
                
                {/* Render subnav items if they exist and the parent is active */}
                {item.subItems && (pathname === item.href || pathname.startsWith(`${item.href}/`)) && (
                  <div className="ml-7 space-y-1 border-l-2 border-primary/20 pl-3 py-1 animate-fadeIn">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                          pathname === subItem.href || pathname.startsWith(`${subItem.href}/`)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <div className={`p-1 rounded-md ${pathname === subItem.href || pathname.startsWith(`${subItem.href}/`) ? "bg-primary/10" : ""}`}>
                          {subItem.icon}
                        </div>
                        <span className="ml-2">{subItem.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-border/50 bg-muted/20">
            <div className="flex items-center p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer">
              <div className="flex-shrink-0">
                <Avatar className="border-2 border-primary/20 h-10 w-10 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user?.first_name?.[0] || user?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium line-clamp-1">
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
