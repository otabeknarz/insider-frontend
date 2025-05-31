"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDisplay, TaskStatusFrontend, TaskPriorityFrontend, convertTaskToApiFormat } from "@/lib/types";

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDisplay | null;
  onTaskSaved: () => void;
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  position?: {
    id: number;
    name: string;
  };
  region?: {
    id: number;
    name: string;
  };
  district?: {
    id: number;
    name: string;
    region: number;
  };
  created_at: string;
  updated_at: string;
}

export default function TaskDrawer({
  isOpen,
  onClose,
  task = null,
  onTaskSaved,
}: TaskDrawerProps) {
  const { t } = useLanguage();
  const isEditing = !!task;
  
  const [formData, setFormData] = useState<TaskDisplay>({
    title: "",
    description: "",
    status: "todo" as TaskStatusFrontend,
    priority: "medium" as TaskPriorityFrontend,
    assignee: "",
    dueDate: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Load task data if editing
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
      });
    }
  }, [task]);

  // Load users for assignee dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await ApiService.getUsers(undefined, true);
        if (Array.isArray(response)) {
          setUsers(response);
        } else {
          setUsers(response.data.results || []);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TaskDisplay) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isEditing && task?.id) {
        // Update existing task
        await ApiService.updateTask(String(task.id), convertTaskToApiFormat(formData));
      } else {
        // Create new task
        await ApiService.createTask(formData);
      }
      
      onTaskSaved();
      onClose();
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Failed to save task. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-bold">
              {isEditing ? t("tasks.editTask") || "Edit Task" : t("tasks.addTask") || "Create Task"}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          {error && (
            <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md mt-2 text-sm">
              {error}
            </div>
          )}
        </DrawerHeader>
        
        <div className="px-4 py-4 overflow-y-auto">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium">
                {t("tasks.title") || "Title"}
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                placeholder={t("tasks.titlePlaceholder") || "Enter task title"}
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium">
                {t("tasks.description") || "Description"}
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background resize-none"
                placeholder={t("tasks.descriptionPlaceholder") || "Enter task description"}
              />
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium">
                {t("tasks.status") || "Status"}
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              >
                <option value="todo">{t("tasks.todo")}</option>
                <option value="inProgress">{t("tasks.inProgress")}</option>
                <option value="done">{t("tasks.done")}</option>
              </select>
            </div>
            
            {/* Priority */}
            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium">
                {t("tasks.priority") || "Priority"}
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              >
                <option value="low">{t("tasks.priorityLow") || "Low"}</option>
                <option value="medium">{t("tasks.priorityMedium") || "Medium"}</option>
                <option value="high">{t("tasks.priorityHigh") || "High"}</option>
              </select>
            </div>
            
            {/* Assignee */}
            <div className="space-y-2">
              <label htmlFor="assignee" className="block text-sm font-medium">
                {t("tasks.assignee") || "Assignee"}
              </label>
              <select
                id="assignee"
                name="assignee"
                value={formData.assignee || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                disabled={loadingUsers}
              >
                <option value="">{t("tasks.selectAssignee") || "Select an assignee"}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.username})
                  </option>
                ))}
              </select>
              {loadingUsers && (
                <div className="text-xs text-muted-foreground">{t("tasks.loadingUsers") || "Loading users..."}</div>
              )}
            </div>
            
            {/* Due Date */}
            <div className="space-y-2">
              <label htmlFor="dueDate" className="block text-sm font-medium">
                {t("tasks.dueDate") || "Due Date"}
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              />
            </div>
          </form>
        </div>
        
        <DrawerFooter className="border-t border-border">
          <Button 
            type="submit" 
            form="task-form"
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("tasks.saving") || "Saving..."}
              </span>
            ) : isEditing ? (
              t("tasks.updateTask") || "Update Task"
            ) : (
              t("tasks.createTask") || "Create Task"
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel") || "Cancel"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
