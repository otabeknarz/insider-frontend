// Define common types used throughout the application

/**
 * User-related interfaces
 */
export interface Position {
  id: number;
  name: string;
}

export interface Region {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  region: number;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name: string;
  last_name: string;
  position: Position;
  region: Region;
  district: District;
  created_at: string;
  updated_at: string;
  date_joined: string;
  get_full_name?: () => string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  position?: string | Position;
  region?: string | Region;
  district?: District;
  get_full_name: () => string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: (token: string) => boolean;
}

/**
 * Task-related interfaces and types
 */

// Comment interface for task comments
export interface Comment {
  id: number;
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: number;
  user: number;
}

// Backend Task model (matches API response)
export interface Task {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  status: number;
  is_checked: boolean;
  priority: number;
  deadline: string;
  created_by: User;
  team: number | null;
  assigned_users: User[];
  comments: Comment[];
}

// Frontend Task representation for UI components
export interface TaskDisplay {
  id?: string | number;
  title: string; // Maps to name in backend
  description: string;
  status: TaskStatusFrontend;
  priority: TaskPriorityFrontend;
  assignee?: string;
  dueDate?: string; // Maps to deadline in backend
  team?: number | null;
  assignedUsers?: User[];
}

// Team interface
export interface Team {
  id: number;
  name: string;
  description: string;
  members: User[];
}

/**
 * Status and priority mappings
 */

// Backend status (numeric values)
export enum TaskStatusBackend {
  ASSIGNED = 1,
  RECEIVED = 2,
  IN_PROCESS = 3,
  COMPLETED = 4,
}

// Backend priority (numeric values)
export enum TaskPriorityBackend {
  MEDIUM = 1,
  HIGH = 2,
}

// Frontend status (string values)
export type TaskStatusFrontend = "assigned" | "received" | "inProcess" | "done";

// Frontend priority (string values)
export type TaskPriorityFrontend = "medium" | "high";

// Mapping between backend and frontend status
export const taskStatusMapping: Record<TaskStatusBackend, TaskStatusFrontend> =
  {
    [TaskStatusBackend.ASSIGNED]: "assigned",
    [TaskStatusBackend.RECEIVED]: "received",
    [TaskStatusBackend.IN_PROCESS]: "inProcess",
    [TaskStatusBackend.COMPLETED]: "done",
  };

// Mapping between frontend and backend status
export const taskStatusReverseMapping: Record<
  TaskStatusFrontend,
  TaskStatusBackend
> = {
  assigned: TaskStatusBackend.ASSIGNED,
  received: TaskStatusBackend.RECEIVED,
  inProcess: TaskStatusBackend.IN_PROCESS,
  done: TaskStatusBackend.COMPLETED,
};

// Mapping between backend and frontend priority
export const taskPriorityMapping: Record<
  TaskPriorityBackend,
  TaskPriorityFrontend
> = {
  [TaskPriorityBackend.MEDIUM]: "medium",
  [TaskPriorityBackend.HIGH]: "high",
};

// Mapping between frontend and backend priority
export const taskPriorityReverseMapping: Record<
  TaskPriorityFrontend,
  TaskPriorityBackend
> = {
  medium: TaskPriorityBackend.MEDIUM,
  high: TaskPriorityBackend.HIGH,
};

/**
 * Utility functions for converting between backend and frontend representations
 */

// Convert backend task to frontend display format
export function convertTaskToDisplayFormat(task: Task): TaskDisplay {
  return {
    id: task.id,
    title: task.name,
    description: task.description,
    status: taskStatusMapping[task.status as TaskStatusBackend] || "assigned",
    priority:
      taskPriorityMapping[task.priority as TaskPriorityBackend] || "medium",
    dueDate: task.deadline,
    team: task.team,
    assignedUsers: task.assigned_users,
  };
}

// Convert frontend task to backend format for API requests
export function convertTaskToApiFormat(task: TaskDisplay): Partial<Task> {
  return {
    id: typeof task.id === "number" ? task.id : undefined,
    name: task.title,
    description: task.description,
    status: taskStatusReverseMapping[task.status],
    priority: taskPriorityReverseMapping[task.priority],
    deadline: task.dueDate,
    team: task.team,
  };
}

/**
 * Dashboard-related interfaces
 */

// Activity interface for dashboard activities
export interface Activity {
  id: string;
  type: "created" | "updated" | "completed";
  taskTitle: string;
  timestamp: string;
}

// Notification interface for user notifications
export interface Notification {
  id: number;
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: number | null;
  team: number | null;
  user: string;
}
