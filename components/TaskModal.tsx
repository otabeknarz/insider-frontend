"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { TaskDisplay, TaskStatusFrontend, TaskPriorityFrontend, convertTaskToApiFormat } from "@/lib/types";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskDisplay | null;
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

interface Comment {
  id: string;
  user: User;
  text: string;
  date: string;
}

interface TaskWithUIComments extends TaskDisplay {
  comments?: Comment[];
}

export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  onTaskSaved,
}: TaskModalProps) {
  const { t } = useLanguage();
  const isEditing = !!task;

  const [formData, setFormData] = useState<TaskWithUIComments>({
    title: "",
    description: "",
    status: "todo" as TaskStatusFrontend,
    priority: "medium" as TaskPriorityFrontend,
    dueDate: "",
    comments: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: "todo" as TaskStatusFrontend,
        priority: "medium" as TaskPriorityFrontend,
        dueDate: "",
        comments: [],
      });
    }
  }, [task]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await ApiService.getUsers(undefined, true);
        if (Array.isArray(response)) {
          setUsers(response);
        } else {
          setUsers(response.data.results);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TaskWithUIComments) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && task?.id) {
        await ApiService.updateTask(String(task.id), convertTaskToApiFormat(formData));
      } else {
        await ApiService.createTask(convertTaskToApiFormat(formData));
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isEditing ? "Edit Task" : "Create New Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
            />
          </div>
          
          {/* Status */}
          <div className="space-y-2">
            <label htmlFor="status" className="block text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
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
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          {/* Assignee */}
          <div className="space-y-2">
            <label htmlFor="assignee" className="block text-sm font-medium">
              Assignee
            </label>
            <select
              id="assignee"
              name="assignee"
              value={formData.assignee || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
              disabled={loadingUsers}
            >
              <option value="">Select an assignee</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
            </select>
            {loadingUsers && (
              <div className="text-xs text-muted-foreground">Loading users...</div>
            )}
          </div>
          
          {/* Due Date */}
          <div className="space-y-2">
            <label htmlFor="dueDate" className="block text-sm font-medium">
              Due Date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-input rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : isEditing ? (
                "Update Task"
              ) : (
                "Create Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
