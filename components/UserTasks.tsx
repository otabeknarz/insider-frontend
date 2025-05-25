"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

// Define the UserTask interface based on the API response
interface UserTask {
  id: number;
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: string | null;
  team: string | null;
  user: string;
}

interface UserTasksResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserTask[];
}

export default function UserTasks() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserTasks = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserTasks();
        if (Array.isArray(response)) {
          setTasks(response);
        } else {
          setTasks(response.data.results);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching user tasks:", err);
        setError("Failed to load tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserTasks();
  }, []);

  const markAsRead = async (taskId: number) => {
    // This would be implemented if the API supports marking tasks as read
    // For now, we'll just update the local state
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, is_read: true } : task
      )
    );
  };

  // Format date to relative time (e.g., "2 hours ago")
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">
        {t("tasks.yourTasks") || "Your Tasks"}
      </h2>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tasks.length === 0 && (
        <Card className="mb-4">
          <CardContent className="pt-6 text-center text-muted-foreground">
            {t("tasks.noTasks") || "You have no tasks at the moment."}
          </CardContent>
        </Card>
      )}

      {/* Tasks list */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-all ${
                !task.is_read ? "border-primary/50" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                      {!task.is_read && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full"></div>
                      )}
                      <span className="text-xs">
                        {task.user.substring(0, 2)}
                      </span>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{task.user}</CardTitle>
                      <CardDescription className="text-xs">
                        {formatDate(task.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{task.message}</p>
              </CardContent>
              <CardFooter className="pt-0 flex justify-end">
                {!task.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(task.id)}
                  >
                    {t("tasks.markAsRead") || "Mark as read"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
