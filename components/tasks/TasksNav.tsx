"use client"

import { usePathname, useRouter } from "next/navigation"
import { Archive, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-provider"

interface TasksNavProps {
  className?: string
}

export function TasksNav({ className }: TasksNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  
  const isActive = pathname === "/tasks" || pathname === "/tasks/active"
  const isArchived = pathname === "/tasks/archived"

  return (
    <div className={`flex space-x-1 ${className}`}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className="gap-2"
        onClick={() => router.push("/tasks")}
      >
        <CheckCircle className="h-4 w-4" />
        {t("tasks.active") || "Active"}
      </Button>
      <Button
        variant={isArchived ? "secondary" : "ghost"}
        size="sm"
        className="gap-2"
        onClick={() => router.push("/tasks/archived")}
      >
        <Archive className="h-4 w-4" />
        {t("tasks.archived") || "Archived"}
      </Button>
    </div>
  )
}
