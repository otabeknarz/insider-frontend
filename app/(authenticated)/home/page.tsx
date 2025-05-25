"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  CheckCircle2,
  CircleDashed,
  Clock,
  ListChecks,
} from "lucide-react";

// Task type definition
interface Task {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  status: number;
  is_checked: boolean;
  priority: number;
  deadline: string;
  created_by: string;
  team: number;
  assigned_users: User[];
}

// User type definition
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

// Activity type definition
interface Activity {
  id: string;
  type: "created" | "updated" | "completed";
  taskTitle: string;
  timestamp: string;
}

// Notification type definition
interface Notification {
  id: number;
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: number | null;
  team: number | null;
  user: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch tasks - get the latest 10 tasks
        const tasksResponse = await ApiService.getTasks();
        let tasksList = [];

        if (Array.isArray(tasksResponse)) {
          tasksList = tasksResponse.slice(0, 10);
        } else {
          tasksList = tasksResponse.data.results.slice(0, 10) || [];
        }

        // Sort tasks by creation date (newest first)
        tasksList.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTasks(tasksList);

        // Generate activities based on tasks
        const recentActivities = tasksList
          .slice(0, Math.min(5, tasksList.length))
          .map((task: Task, index: number) => {
            return {
              id: `activity-${task.id}`,
              type:
                task.status === 2
                  ? "completed"
                  : ((task.status === 1 ? "updated" : "created") as
                      | "created"
                      | "updated"
                      | "completed"),
              taskTitle: task.name,
              timestamp: formatDistanceToNow(new Date(task.updated_at), {
                addSuffix: true,
              }),
            };
          });

        setActivities(recentActivities);

        // Fetch notifications
        const notificationsResponse = await ApiService.getNotifications();
        if (Array.isArray(notificationsResponse)) {
          setNotifications(notificationsResponse.slice(0, 5));
        } else {
          setNotifications(
            notificationsResponse.data.results.slice(0, 5) || []
          );
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Count tasks by status
  const totalTasks = tasks ? tasks.length : 0;
  const inProgressTasks = tasks
    ? tasks.filter((task) => task.status === 1).length
    : 0;
  const completedTasks = tasks
    ? tasks.filter((task) => task.status === 2).length
    : 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            {t("home.welcome")}, {user?.first_name || user?.username}!
          </h1>
          <p className="text-muted-foreground mt-1">{t("home.description")}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button asChild>
            <Link href="/tasks">
              <ListChecks className="mr-2 h-4 w-4" />
              {t("home.manageTasks")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading and error states */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {/* Task Statistics */}
          <Card className="w-1/3">
            <CardHeader className="pb-2">
              <CardTitle>{t("home.taskStats")}</CardTitle>
              <CardDescription>{t("home.quickStats")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center">
                    <ListChecks className="mr-3 h-5 w-5 text-primary" />
                    <span>{t("home.totalTasks")}</span>
                  </div>
                  <Badge variant="outline" className="text-lg font-semibold">
                    {totalTasks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center">
                    <CircleDashed className="mr-3 h-5 w-5 text-yellow-500" />
                    <span>{t("home.inProgressTasks")}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-lg font-semibold bg-yellow-100 dark:bg-yellow-900/30"
                  >
                    {inProgressTasks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle2 className="mr-3 h-5 w-5 text-green-500" />
                    <span>{t("home.completedTasks")}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-lg font-semibold bg-green-100 dark:bg-green-900/30"
                  >
                    {completedTasks}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>{t("home.recentTasks")}</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tasks">{t("home.viewAllTasks")}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="grid gap-3">
                  {tasks.slice(0, 5).map((task) => {
                    // Determine priority badge color
                    const priorityVariants = {
                      1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                      3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                    };

                    // Determine priority label
                    const priorityLabels = {
                      1: t("tasks.priorityLow"),
                      2: t("tasks.priorityMedium"),
                      3: t("tasks.priorityHigh"),
                    };

                    // Determine status label
                    const statusLabels = {
                      0: t("tasks.todo"),
                      1: t("tasks.inProgress"),
                      2: t("tasks.done"),
                    };

                    // Format deadline
                    const deadline = task.deadline
                      ? new Date(task.deadline)
                      : null;
                    const formattedDeadline = deadline
                      ? deadline.toLocaleDateString()
                      : "";
                    const isOverdue = deadline
                      ? new Date() > deadline && task.status !== 2
                      : false;

                    return (
                      <Link
                        href={`/tasks/${task.id}`}
                        key={task.id}
                        className="block"
                      >
                        <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-medium line-clamp-1">
                              {task.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={
                                priorityVariants[task.priority as 1 | 2 | 3]
                              }
                            >
                              {priorityLabels[task.priority as 1 | 2 | 3]}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 text-xs">
                            <Badge variant="secondary">
                              {statusLabels[task.status as 0 | 1 | 2]}
                            </Badge>
                            {deadline && (
                              <Badge
                                variant="outline"
                                className={
                                  isOverdue
                                    ? "border-destructive text-destructive"
                                    : ""
                                }
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {isOverdue
                                  ? t("home.overdue")
                                  : t("home.due")}: {formattedDeadline}
                              </Badge>
                            )}
                          </div>

                          {task.assigned_users.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {t("home.assignedTo")}:
                              </span>
                              <div className="flex -space-x-2">
                                {task.assigned_users.map((user, index) => (
                                  <div
                                    key={index}
                                    className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium"
                                    title={`${user.first_name} ${user.last_name}`}
                                  >
                                    {user.first_name?.charAt(0)}
                                    {user.last_name?.charAt(0)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("tasks.noTasks")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
