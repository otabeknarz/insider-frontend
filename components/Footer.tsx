"use client";

import { useLanguage } from "@/lib/language-provider";

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background border-t border-border py-4 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <div>
          © {currentYear} Insider App
        </div>
        <div className="mt-2 md:mt-0">
          Ibrat Debate Team
        </div>
      </div>
    </footer>
  );
}
