"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Home, ClipboardList, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Task,
  User,
  Team,
  TaskStatusBackend,
  TaskPriorityBackend,
} from "@/lib/types";
import { TaskSection } from "@/components/tasks/TaskSection";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Initial empty tasks array
const initialTasks: Task[] = [];

export default function ArchivedTasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // State for tasks
  const [tasksToMe, setTasksToMe] = useState<Task[]>(initialTasks);
  const [tasksByMe, setTasksByMe] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for task drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);
  
  // State for delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  // State for task dialog
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [dialogTask, setDialogTask] = useState<Task | null>(null);
  
  // State for drag and drop
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks assigned to me with is_archived=true using the specific endpoint
      const tasksToMeResponse = await ApiService.getWithPagination<Task>(
        "/api/core/tasks/to-me/?is_archived=true"
      );

      // Fetch tasks created by me with is_archived=true using the specific endpoint
      const tasksByMeResponse = await ApiService.getWithPagination<Task>(
        "/api/core/tasks/by-me/?is_archived=true"
      );

      // Set the tasks data
      if ('data' in tasksToMeResponse) {
        setTasksToMe(tasksToMeResponse.data.results);
      }
      
      if ('data' in tasksByMeResponse) {
        setTasksByMe(tasksByMeResponse.data.results);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError(t("tasks.fetchError") || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  // Handle unarchiving a task
  const handleUnarchiveTask = async (task: Task, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      await ApiService.archiveTask(task.id.toString(), false);
      
      // Update the local state to remove the unarchived task
      if (task.created_by?.id && user?.id && task.created_by.id.toString() === user.id.toString()) {
        setTasksByMe(prev => prev.filter(t => t.id !== task.id));
      }
      
      if (task.assigned_users && Array.isArray(task.assigned_users) && 
          task.assigned_users.some((assignee: { id: number | string }) => 
            assignee.id.toString() === user?.id?.toString()
          )
      ) {
        setTasksToMe(prev => prev.filter(t => t.id !== task.id));
      }
      
      // Show success message
      toast.success(t("tasks.unarchivedSuccess") || "Task unarchived successfully");
    } catch (error) {
      console.error("Error unarchiving task:", error);
      toast.error(t("tasks.unarchiveError") || "Failed to unarchive task");
    }
  };

  // Handle priority change for mobile devices
  const handlePriorityChange = async (
    task: Task,
    newPriority: number
  ) => {
    try {
      await ApiService.updateTask(task.id.toString(), {
        priority: newPriority,
      });

      // Update local state
      if (task.created_by?.id?.toString() === user?.id?.toString()) {
        setTasksByMe((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, priority: newPriority } : t
          )
        );
      }

      if (task.assigned_users && Array.isArray(task.assigned_users) && 
          task.assigned_users.some((assignee: { id: number | string }) => 
            assignee.id.toString() === user?.id?.toString()
          )
      ) {
        setTasksToMe((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, priority: newPriority } : t
          )
        );
      }
    } catch (error) {
      console.error("Error updating task priority:", error);
      toast.error(t("tasks.priorityUpdateError") || "Failed to update priority");
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center" href="/">
              <Home className="h-4 w-4 mr-1" />
              {t("breadcrumb.home") || "Home"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center" href="/tasks">
              <ClipboardList className="h-4 w-4 mr-1" />
              {t("breadcrumb.tasks") || "Tasks"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center">
              <Archive className="h-4 w-4 mr-1" />
              {t("breadcrumb.archived") || "Archived"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("tasks.archivedTasks") || "Archived Tasks"}
        </h1>
      </div>

      <Tabs defaultValue="to-me" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="to-me">
            {t("tasks.assignedToMe") || "Assigned to Me"}
          </TabsTrigger>
          <TabsTrigger value="by-me">
            {t("tasks.createdByMe") || "Created by Me"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="to-me">
          <TaskSection
            tasks={tasksToMe}
            loading={loading}
            error={error}
            onAddTask={() => {}}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={() => {}}
            isTasksCreatedByMe={false}
            onPriorityChange={handlePriorityChange}
            onArchiveTask={handleUnarchiveTask}
            title={t("tasks.archivedAssignedToMe") || "Archived Tasks Assigned to Me"}
          />
        </TabsContent>
        <TabsContent value="by-me">
          <TaskSection
            tasks={tasksByMe}
            loading={loading}
            error={error}
            onAddTask={() => {}}
            onEditTask={() => {}}
            onDeleteTask={() => {}}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={() => {}}
            isTasksCreatedByMe={true}
            onPriorityChange={handlePriorityChange}
            onArchiveTask={handleUnarchiveTask}
            title={t("tasks.archivedCreatedByMe") || "Archived Tasks Created by Me"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
