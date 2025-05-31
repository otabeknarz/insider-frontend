/**
 * Application constants
 */

// API URLs
export const API_BASE_URL = "https://insiderapi.ibratdebate.uz";
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/token/`,
    REFRESH: `${API_BASE_URL}/api/auth/token/refresh/`,
    ME: `${API_BASE_URL}/api/auth/users/me/`,
    USERS: `${API_BASE_URL}/api/auth/users/`,
  },

  // Tasks
  TASKS: {
    LIST: `${API_BASE_URL}/api/tasks/`,
    DETAIL: (id: string) => `${API_BASE_URL}/api/tasks/${id}/`,
    CREATE: `${API_BASE_URL}/api/tasks/`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/tasks/${id}/`,
    DELETE: (id: string) => `${API_BASE_URL}/api/tasks/${id}/`,
    USER_TASKS: `${API_BASE_URL}/api/core/tasks/`,
  },

  // Boards
  BOARDS: {
    LIST: `${API_BASE_URL}/api/boards/`,
    DETAIL: (id: string) => `${API_BASE_URL}/api/boards/${id}/`,
  },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "insider-access-token",
  REFRESH_TOKEN: "insider-refresh-token",
  USER: "insider-user",
  THEME: "insider-theme",
  LANGUAGE: "insider-language",
};

// Authentication
export const AUTH_CONFIG = {
  TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour in milliseconds
  REFRESH_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// App settings
export const APP_CONFIG = {
  APP_NAME: "Insider",
  DEFAULT_LANGUAGE: "en",
  AVAILABLE_LANGUAGES: ["en", "uz"],
  DEFAULT_THEME: "system",
};

// Task status and priority options (frontend representation)
// These are now defined in types.ts with proper mappings to backend values
import { TaskStatusFrontend, TaskPriorityFrontend } from "./types";

// Frontend task status options
export const TASK_STATUS: Record<string, TaskStatusFrontend> = {
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  DONE: "done",
};

// Frontend task priority options
export const TASK_PRIORITY: Record<string, TaskPriorityFrontend> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};
