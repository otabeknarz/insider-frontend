import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "./constants";
import { jwtDecode } from "jwt-decode";

// Define interface for paginated responses
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest", // Help reduce OPTIONS requests
  },
});

// Request cache to prevent duplicate requests
const requestCache: Record<
  string,
  { promise: Promise<any>; timestamp: number }
> = {};

// Cache expiry time in milliseconds
const CACHE_EXPIRY = 2000; // 2 seconds

// Function to check if token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Check if token has expiration and if it's expired
    return decoded.exp ? decoded.exp < currentTime : false;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true; // If we can't decode the token, consider it expired
  }
};

// Refresh token promise to prevent multiple simultaneous refresh requests
let refreshTokenPromise: Promise<string | null> | null = null;

// Function to refresh token with request deduplication
const refreshAccessToken = async (): Promise<string | null> => {
  // If there's already a refresh in progress, return that promise instead of making a new request
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  // Create a new refresh token promise
  refreshTokenPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        return null;
      }

      // Create a standalone axios instance for refresh requests to avoid interceptors
      const response = await axios
        .create({
          baseURL: API_BASE_URL,
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        })
        .post(`/api/auth/token/refresh/`, { refresh: refreshToken });

      if (response.data.access) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
        return response.data.access;
      }

      return null;
    } catch (error) {
      console.error("Error refreshing token:", error);
      // Clear tokens on refresh failure
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      return null;
    } finally {
      // Clear the promise so future calls can create a new one
      setTimeout(() => {
        refreshTokenPromise = null;
      }, 1000); // Small delay to prevent rapid consecutive calls
    }
  })();

  return refreshTokenPromise;
};

// Function to create a request key from config
const createRequestKey = (method: string, url: string, data?: any): string => {
  return `${method}:${url}:${data ? JSON.stringify(data) : ""}`;
};

// Enhanced axios with request deduplication
const dedupedRequest = async <T>(
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  // Don't cache certain types of requests
  const skipCache =
    config.method?.toLowerCase() === "put" ||
    config.method?.toLowerCase() === "delete" ||
    config.method?.toLowerCase() === "patch";

  if (skipCache) {
    return axiosInstance(config);
  }

  const key = createRequestKey(
    config.method || "get",
    config.url || "",
    config.data
  );

  // Check if we have a cached request that's not expired
  const now = Date.now();
  const cachedRequest = requestCache[key];

  if (cachedRequest && now - cachedRequest.timestamp < CACHE_EXPIRY) {
    return cachedRequest.promise;
  }

  // Create a new request and cache it
  const promise = axiosInstance(config);
  requestCache[key] = {
    promise,
    timestamp: now,
  };

  // Clean up cache after request completes
  promise.finally(() => {
    setTimeout(() => {
      delete requestCache[key];
    }, CACHE_EXPIRY);
  });

  return promise;
};

// Cache for token expiration checks to reduce redundant checks
const tokenExpiryCache = {
  token: "",
  expiryTime: 0,
  isExpired: false,
};

// Request interceptor for adding token and handling token expiration
axiosInstance.interceptors.request.use(
  async (config) => {
    // Skip token handling for refresh token requests to prevent circular dependencies
    const isRefreshRequest = config.url?.includes("/api/auth/token/refresh/");
    if (isRefreshRequest) {
      return config;
    }

    // Get token from localStorage
    let token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    // If token exists, check if it's expired
    if (token) {
      // Use cached expiry check if it's the same token
      let isExpired = false;
      if (
        token === tokenExpiryCache.token &&
        Date.now() / 1000 < tokenExpiryCache.expiryTime
      ) {
        isExpired = tokenExpiryCache.isExpired;
      } else {
        isExpired = isTokenExpired(token);

        // Update cache
        try {
          const decoded: any = jwtDecode(token);
          tokenExpiryCache.token = token;
          tokenExpiryCache.expiryTime = decoded.exp || 0;
          tokenExpiryCache.isExpired = isExpired;
        } catch (e) {
          // If decoding fails, don't cache
        }
      }

      if (isExpired) {
        console.log("Access token expired, attempting to refresh...");
        // Token is expired, try to refresh
        const newToken = await refreshAccessToken();

        if (newToken) {
          token = newToken;
        } else {
          // If refresh failed and we're not already on the login page, redirect
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            window.location.href = "/login";
          }
          return Promise.reject(new Error("Session expired"));
        }
      }

      // Add token to headers
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        // Add headers that might help reduce OPTIONS requests
        config.headers["X-Requested-With"] = "XMLHttpRequest";
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip handling for refresh token requests to prevent circular dependencies
    const isRefreshRequest = originalRequest?.url?.includes(
      "/api/auth/token/refresh/"
    );
    if (isRefreshRequest) {
      return Promise.reject(error);
    }

    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Update authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Add headers that might help reduce OPTIONS requests
          originalRequest.headers["X-Requested-With"] = "XMLHttpRequest";

          // Retry original request
          return axiosInstance(originalRequest);
        } else {
          // Refresh failed, redirect to login
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            window.location.href = "/login";
          }
          return Promise.reject(new Error("Authentication failed"));
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/login")
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API service class
class ApiService {
  // Authentication
  static async login(
    username: string,
    password: string
  ): Promise<AxiosResponse> {
    console.log(`Sending login request to ${API_BASE_URL}/api/auth/token/`);
    try {
      // Don't dedupe login requests
      const response = await axiosInstance.post("/api/auth/token/", {
        username,
        password,
      });
      console.log("Login API response:", response.data);
      return response;
    } catch (error: any) {
      console.error(
        "Login API error:",
        error?.response?.data || error.message || error
      );
      throw error;
    }
  }

  static refreshToken(refresh: string): Promise<AxiosResponse> {
    // Don't dedupe refresh token requests
    return axiosInstance.post("/api/auth/token/refresh/", { refresh });
  }

  static getCurrentUser(): Promise<AxiosResponse> {
    return dedupedRequest({ method: "get", url: "/api/auth/users/me/" });
  }

  // Profile methods
  static getUserProfile(): Promise<AxiosResponse> {
    return dedupedRequest({ method: "get", url: "/api/auth/users/me/" });
  }

  static updateUserProfile(data: any): Promise<AxiosResponse> {
    // Use PUT for full profile update (replacing the entire resource)
    return dedupedRequest({ method: "put", url: "/api/auth/users/me/", data });
  }

  static patchUserProfile(data: any): Promise<AxiosResponse> {
    // Use PATCH for partial profile update (updating specific fields)
    return dedupedRequest({
      method: "patch",
      url: "/api/auth/users/me/",
      data,
    });
  }

  // Users
  static getUsers<T = any>(
    search?: string,
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    const url = search
      ? `/api/auth/users/?search=${encodeURIComponent(search)}`
      : "/api/auth/users/";
    return this.getWithPagination<T>(url, getAll);
  }

  static changePassword(data: {
    current_password: string;
    password: string;
  }): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "post",
      url: "/api/auth/users/set_password/",
      data,
    });
  }

  // Tasks
  static getTasks<T = any>(
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    return this.getWithPagination<T>("/api/core/tasks/", getAll);
  }

  static getUserTasks<T = any>(
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    return this.getWithPagination<T>("/api/core/tasks/", getAll);
  }

  static getTask(id: string): Promise<AxiosResponse> {
    return dedupedRequest({ method: "get", url: `/api/core/tasks/${id}/` });
  }

  static getTaskWithComments(id: string): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "get",
      url: `/api/core/tasks/${id}/comments/`,
    });
  }

  static addTaskComment(
    taskId: string,
    message: string
  ): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "post",
      url: `/api/core/tasks/${taskId}/comments/`,
      data: { message },
    });
  }

  static createTask(data: any): Promise<AxiosResponse> {
    return dedupedRequest({ method: "post", url: "/api/core/tasks/", data });
  }

  static updateTask(id: string, data: any): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "patch",
      url: `/api/core/tasks/${id}/`,
      data,
    });
  }

  static deleteTask(id: string): Promise<AxiosResponse> {
    return dedupedRequest({ method: "delete", url: `/api/core/tasks/${id}/` });
  }

  // Boards
  static getBoards<T = any>(
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    return this.getWithPagination<T>("/api/boards/", getAll);
  }

  static getBoard(id: string): Promise<AxiosResponse> {
    return dedupedRequest({ method: "get", url: `/api/boards/${id}/` });
  }

  static createBoard(data: any): Promise<AxiosResponse> {
    return dedupedRequest({ method: "post", url: "/api/boards/", data });
  }

  static updateBoard(id: string, data: any): Promise<AxiosResponse> {
    return dedupedRequest({ method: "put", url: `/api/boards/${id}/`, data });
  }

  static deleteBoard(id: string): Promise<AxiosResponse> {
    return dedupedRequest({ method: "delete", url: `/api/boards/${id}/` });
  }

  // Notifications
  static getNotifications<T = any>(
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    return this.getWithPagination<T>("/api/core/notifications/", getAll);
  }

  static markNotificationAsRead(id: number): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "patch",
      url: `/api/core/notifications/${id}/`,
      data: { is_read: true },
    });
  }

  // Teams
  static getTeams<T = any>(
    search?: string,
    getAll: boolean = false
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    const url = search
      ? `/api/core/teams/?search=${encodeURIComponent(search)}`
      : "/api/core/teams/";
    return this.getWithPagination<T>(url, getAll);
  }

  /**
   * Create a new team
   * @param data Team data including name and description
   * @returns Promise with the created team data
   */
  static createTeam(data: {
    name: string;
    description: string;
  }): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "post",
      url: "/api/core/teams/",
      data,
    });
  }

  /**
   * Get team details by ID
   * @param id Team ID
   * @returns Promise with team details
   */
  static getTeam(id: string): Promise<AxiosResponse> {
    return dedupedRequest({
      method: "get",
      url: `/api/core/teams/${id}/`,
    });
  }

  // Generic request method
  static request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return dedupedRequest(config);
  }

  /**
   * Generic GET method with pagination support
   * @param url The API endpoint URL
   * @param getAll Whether to fetch all pages (true) or just the first page (false)
   * @param config Optional axios config
   * @returns Promise with response data or all results if getAll is true
   */
  static async getWithPagination<T>(
    url: string,
    getAll: boolean = false,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<PaginatedResponse<T>> | T[]> {
    if (!getAll) {
      return dedupedRequest<PaginatedResponse<T>>({
        method: "get",
        url,
        ...config,
      });
    }

    // If getAll is true, fetch all pages
    let nextUrl: string | null = url;
    let allResults: T[] = [];

    while (nextUrl) {
      try {
        const response: AxiosResponse<PaginatedResponse<T>> =
          await dedupedRequest({
            method: "get",
            url: nextUrl,
            ...config,
          });

        const data = response.data;

        if (Array.isArray(data.results)) {
          allResults = [...allResults, ...data.results];
        }

        nextUrl = data.next;
      } catch (error) {
        console.error("Error fetching paginated data:", error);
        throw error;
      }
    }

    return allResults;
  }
}

export default ApiService;
