import React from "react";
import { Task } from "@/lib/types";
import { TaskCard } from "./TaskCard";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task, event?: React.MouseEvent) => void;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (status: number) => void;
  isTasksCreatedByMe?: boolean; // Indicates if tasks in this column were created by the current user
  onPriorityChange?: (task: Task, newPriority: number) => void; // For mobile priority changes
}

export function TaskColumn({
  title,
  tasks,
  status,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isTasksCreatedByMe = false,
  onPriorityChange,
}: TaskColumnProps) {
  return (
    <div
      className="bg-muted/30 rounded-lg p-4"
      onDragOver={onDragOver}
      onDrop={() => onDrop(status)}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            isCreatedByMe={isTasksCreatedByMe}
            onPriorityChange={onPriorityChange}
          />
        ))}
      </div>
    </div>
  );
}