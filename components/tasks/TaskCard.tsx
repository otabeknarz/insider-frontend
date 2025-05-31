import React from "react";
import { useLanguage } from "@/lib/language-provider";
import { formatDate } from "@/lib/date-utils";
import { Task, TaskStatusBackend, TaskPriorityBackend } from "@/lib/types";
import { Clock, Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task, event?: React.MouseEvent) => void;
  onDragStart: (task: Task) => void;
  isCreatedByMe?: boolean; // Indicates if the task was created by the current user
  onPriorityChange?: (task: Task, newPriority: number) => void; // For mobile priority changes
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
  isCreatedByMe = false,
  onPriorityChange,
}: TaskCardProps) {
  const { t } = useLanguage();

  // Use string fallbacks for each translation key
  const priorityLabels: Record<number, string> = {
    [TaskPriorityBackend.MEDIUM]:
      t("tasks.priorityMedium") === "tasks.priorityMedium"
        ? "Medium"
        : t("tasks.priorityMedium"),
    [TaskPriorityBackend.HIGH]:
      t("tasks.priorityHigh") === "tasks.priorityHigh"
        ? "High"
        : t("tasks.priorityHigh"),
  };

  const statusLabels: Record<number, string> = {
    [TaskStatusBackend.ASSIGNED]:
      t("tasks.assigned") === "tasks.assigned"
        ? "Assigned"
        : t("tasks.assigned"),
    [TaskStatusBackend.RECEIVED]:
      t("tasks.received") === "tasks.received"
        ? "Received"
        : t("tasks.received"),
    [TaskStatusBackend.IN_PROCESS]:
      t("tasks.inProcess") === "tasks.inProcess"
        ? "In Process"
        : t("tasks.inProcess"),
    [TaskStatusBackend.COMPLETED]:
      t("tasks.completed") === "tasks.completed"
        ? "Completed"
        : t("tasks.completed"),
  };

  // Color schemes for priority and status
  const priorityColors: Record<number, string> = {
    [TaskPriorityBackend.MEDIUM]:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    [TaskPriorityBackend.HIGH]:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const statusColors: Record<number, string> = {
    [TaskStatusBackend.ASSIGNED]:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    [TaskStatusBackend.RECEIVED]:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    [TaskStatusBackend.IN_PROCESS]:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    [TaskStatusBackend.COMPLETED]:
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  const assignedToText =
    t("tasks.assignedTo") === "tasks.assignedTo"
      ? "Assigned to"
      : t("tasks.assignedTo");
  const deadlineText =
    t("tasks.deadline") === "tasks.deadline" ? "Deadline" : t("tasks.deadline");

  // Detect if we're on mobile/touch device
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  
  React.useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);
  
  // Handle priority change for mobile
  const handlePriorityChange = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the edit form
    
    if (!onPriorityChange) return;
    
    // Toggle between medium and high priority
    const newPriority = task.priority === TaskPriorityBackend.MEDIUM ? 
      TaskPriorityBackend.HIGH : TaskPriorityBackend.MEDIUM;
    
    onPriorityChange(task, newPriority);
  };
  
  return (
    <div
      className="group bg-card border border-border/40 rounded-lg shadow-sm p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-border/80 hover:-translate-y-0.5 relative"
      onClick={() => onEdit(task)}
      draggable={!isTouchDevice} // Only make draggable on non-touch devices
      onDragStart={() => onDragStart(task)}
    >
      {/* Delete button - only visible on hover or if created by me */}
      {isCreatedByMe && (
        <button
          className="absolute top-2 right-2 p-1.5 rounded-full bg-muted/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => onDelete(task, e)}
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Task Header */}
      <div className="flex flex-col mb-2 gap-2 sm:flex-row sm:justify-between sm:items-start">
        <h3 className="font-medium text-base line-clamp-1">{task.name}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              priorityColors[task.priority as keyof typeof priorityColors],
              isCreatedByMe && isTouchDevice ? "cursor-pointer active:scale-95" : ""
            )}
            onClick={isCreatedByMe && isTouchDevice ? handlePriorityChange : undefined}
            title={isCreatedByMe && isTouchDevice ? "Tap to change priority" : undefined}
          >
            {priorityLabels[task.priority as keyof typeof priorityLabels]}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              statusColors[task.status as keyof typeof statusColors]
            )}
          >
            {statusLabels[task.status as keyof typeof statusLabels]}
          </span>
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Footer - Assigned Users & Deadline */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-xs text-muted-foreground">
        <div>
          {task.assigned_users && task.assigned_users.length > 0 && (
            <div className="flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              <span className="mr-1.5">{assignedToText}</span>
              <div className="flex -space-x-1">
                {task.assigned_users
                  .filter((user) => user && typeof user === "object" && user.id) // Filter out invalid users
                  .slice(0, 3)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-medium text-primary shadow-sm"
                      title={`${user.first_name || ""} ${user.last_name || ""}`}
                    >
                      {user.first_name?.[0] || ""}
                      {user.last_name?.[0] || ""}
                    </div>
                  ))}
                {task.assigned_users.filter(
                  (user) => user && typeof user === "object" && user.id
                ).length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border border-border/50 flex items-center justify-center text-[10px] font-medium text-muted-foreground shadow-sm">
                    +
                    {task.assigned_users.filter(
                      (user) => user && typeof user === "object" && user.id
                    ).length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {task.deadline && (
          <div className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
            <span>{formatDate(task.deadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
