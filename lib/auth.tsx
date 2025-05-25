"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  JSX,
} from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS, AUTH_CONFIG } from "./constants";
import ApiService from "./api";
import { jwtDecode } from "jwt-decode";

// Types
interface Position {
  id: number;
  name: string;
}

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region: number;
}

interface User {
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

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: (token: string) => boolean;
}

// Create context with a default undefined value
// Using 'null!' as the default value to avoid the need for non-null assertion later
const AuthContext = createContext<AuthContextType>(
  null as unknown as AuthContextType
);

// Provider component
export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user data from API
  const fetchUserData = async (): Promise<User | null> => {
    try {
      const response = await ApiService.getCurrentUser();
      return response.data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token has expiration and if it's expired
      return decoded.exp ? decoded.exp < currentTime : false;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true; // If we can't decode the token, consider it expired
    }
  };

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );

      if (!refreshTokenValue) {
        return false;
      }

      const response = await ApiService.refreshToken(refreshTokenValue);

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
      setTokens({
        access: response.data.access,
        refresh: refreshTokenValue,
      });
      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      logout();
      return false;
    }
  };

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);

        // Check if we have tokens in localStorage
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshTokenValue = localStorage.getItem(
          STORAGE_KEYS.REFRESH_TOKEN
        );

        console.log("Initial auth check:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshTokenValue,
        });

        if (accessToken && refreshTokenValue) {
          // Set tokens
          setTokens({
            access: accessToken,
            refresh: refreshTokenValue,
          });

          try {
            // Fetch user data - our API service will handle token issues automatically
            const userData = await fetchUserData();
            console.log("User data fetched:", userData);

            if (userData) {
              setUser({
                ...userData,
                get_full_name: () =>
                  userData.first_name + " " + userData.last_name,
              });
              // Store user data in localStorage for persistence
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
            } else {
              console.warn("No user data returned from API");
              logout();
            }
          } catch (error) {
            // If there's an error after the API service tried to handle it, we should logout
            console.error("Failed to authenticate user:", error);
            logout();
          }
        } else {
          // Try to get user from localStorage as fallback
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (e) {
              console.error("Error parsing stored user:", e);
              localStorage.removeItem(STORAGE_KEYS.USER);
            }
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    setLoading(true);

    try {
      console.log("Attempting login with username:", username);
      const response = await ApiService.login(username, password);

      console.log("Login response:", response.data);

      if (!response.data.access || !response.data.refresh) {
        console.error("Login response missing tokens", response.data);
        return false;
      }

      // Store tokens in localStorage
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.data.access);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);

      setTokens({
        access: response.data.access,
        refresh: response.data.refresh,
      });

      // Fetch user data
      const userData = await fetchUserData();
      console.log("User data after login:", userData);

      if (userData) {
        setUser(userData);
        // Store user data in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        return true;
      }

      console.warn("Login successful but no user data returned");
      return false;
    } catch (error: any) {
      console.error("Login error:", error?.response?.data || error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    setTokens(null);
    router.push("/login");
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user,
    isTokenExpired,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context;
}
