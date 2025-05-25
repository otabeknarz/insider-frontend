"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function UserTasksWidget() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserTasks = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserTasks();
        const data = response.data as UserTasksResponse;
        setTasks(data.results.slice(0, 3)); // Only show the first 3 tasks
        setError(null);
      } catch (err) {
        console.error("Error fetching user tasks:", err);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchUserTasks();
  }, []);

  const unreadCount = tasks.filter(task => !task.is_read).length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold">
          {t("tasks.yourTasks") || "Your Tasks"}
        </CardTitle>
        {unreadCount > 0 && (
          <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
            {unreadCount}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="text-sm text-destructive">
            {error}
          </div>
        )}
        
        {/* Empty state */}
        {!loading && !error && tasks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-6">
            {t("tasks.noTasks") || "You have no tasks at the moment."}
          </div>
        )}
        
        {/* Tasks list */}
        {!loading && !error && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-3 text-sm rounded-md ${!task.is_read 
                  ? 'bg-primary/10 border-l-2 border-primary' 
                  : 'bg-card hover:bg-accent/50'}`}
              >
                <p className="font-medium mb-1 line-clamp-1">{task.message}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{task.user}</span>
                  {!task.is_read && <span className="text-primary">New</span>}
                </div>
              </div>
            ))}
            
            <Link href="/tasks" className="block w-full mt-4">
              <Button variant="outline" size="sm" className="w-full">
                {t("tasks.viewAll") || "View all tasks"}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
