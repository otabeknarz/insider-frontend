import React from "react";
import { useLanguage } from "@/lib/language-provider";
import { Task, TaskStatusBackend } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskColumn } from "./TaskColumn";

interface TaskSectionProps {
  loading: boolean;
  error: string | null;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task, event?: React.MouseEvent) => void;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (status: number) => void;
  isTasksCreatedByMe?: boolean; // Indicates if tasks in this section were created by the current user
  onPriorityChange?: (task: Task, newPriority: number) => void; // For mobile priority changes
  title?: string; // Optional title for the section
}

export function TaskSection({
  loading,
  error,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDrop,
  isTasksCreatedByMe = false,
  onPriorityChange,
  title,
}: TaskSectionProps) {
  const { t } = useLanguage();

  // Get proper translations with fallbacks for key labels
  const addTaskLabel =
    t("tasks.addTask") === "tasks.addTask" ? "Add Task" : t("tasks.addTask");

  // Filter tasks by status
  const assignedTasks = tasks.filter((task) => task.status === TaskStatusBackend.ASSIGNED);
  const receivedTasks = tasks.filter((task) => task.status === TaskStatusBackend.RECEIVED);
  const inProcessTasks = tasks.filter((task) => task.status === TaskStatusBackend.IN_PROCESS);
  const completedTasks = tasks.filter((task) => task.status === TaskStatusBackend.COMPLETED);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          {t("tasks.loading") === "tasks.loading"
            ? "Loading tasks..."
            : t("tasks.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6 border border-destructive/30 flex items-start gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <h4 className="font-medium">
            {t("tasks.errorTitle") === "tasks.errorTitle"
              ? "Error Loading Tasks"
              : t("tasks.errorTitle")}
          </h4>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-10 text-center">
        <div className="flex justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="15" x2="13" y2="15" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">
          {t("tasks.noTasks") === "tasks.noTasks"
            ? "No Tasks Yet"
            : t("tasks.noTasks")}
        </h3>
        <p className="text-muted-foreground mb-6">
          {t("tasks.createFirst") === "tasks.createFirst"
            ? "Create your first task to get started"
            : t("tasks.createFirst")}
        </p>
        <Button onClick={onAddTask} className="mx-auto">
          <Plus className="mr-2 h-4 w-4" />
          {addTaskLabel}
        </Button>
      </div>
    );
  }

  return (
    <>
      {title && <h2 className="text-xl font-medium mb-4">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <TaskColumn
          title={t("tasks.assigned") || "ASSIGNED"}
          tasks={assignedTasks}
          status={TaskStatusBackend.ASSIGNED}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isTasksCreatedByMe={isTasksCreatedByMe}
          onPriorityChange={onPriorityChange}
        />
        <TaskColumn
          title={t("tasks.received") || "RECEIVED"}
          tasks={receivedTasks}
          status={TaskStatusBackend.RECEIVED}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isTasksCreatedByMe={isTasksCreatedByMe}
          onPriorityChange={onPriorityChange}
        />
        <TaskColumn
          title={t("tasks.inProcess") || "IN PROCESS"}
          tasks={inProcessTasks}
          status={TaskStatusBackend.IN_PROCESS}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isTasksCreatedByMe={isTasksCreatedByMe}
          onPriorityChange={onPriorityChange}
        />
        <TaskColumn
          title={t("tasks.completed") || "COMPLETED"}
          tasks={completedTasks}
          status={TaskStatusBackend.COMPLETED}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          isTasksCreatedByMe={isTasksCreatedByMe}
          onPriorityChange={onPriorityChange}
        />
      </div>
    </>
  );
}
