"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import ApiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import { TaskStatus, TaskPriority } from "@/lib/types";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Task and Comment interfaces
import { Task, Comment, User } from "@/lib/types";

interface TaskDetailResponse extends Task {}

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [task, setTask] = useState<TaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("details");

  // Reference to chat container for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Interval for fetching comments
  const commentIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch task with comments
  const fetchTaskWithComments = async () => {
    try {
      const taskResponse = await ApiService.getTask(id as string);
      const newTask = taskResponse.data;

      // Scroll to bottom of chat if new comments arrived
      if (
        chatContainerRef.current &&
        task &&
        newTask.comments.length > task.comments.length
      ) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }

      setTask(newTask);
    } catch (err) {
      console.error("Error fetching task with comments:", err);
    }
  };

  // Fetch task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        // Get task details
        const taskResponse = await ApiService.getTask(id as string);
        setTask(taskResponse.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching task:", err);
        setError("Failed to load task details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTask();
    }
  }, [id]);

  // Fetch comments with polling
  useEffect(() => {
    // Initial fetch
    fetchTaskWithComments();

    // Set up polling interval (every 5 seconds)
    commentIntervalRef.current = setInterval(fetchTaskWithComments, 5000);

    // Clean up interval on unmount
    return () => {
      if (commentIntervalRef.current) {
        clearInterval(commentIntervalRef.current);
      }
    };
  }, [id, task?.comments?.length]);

  // Handle comment submission
  const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);

      // Make the POST request to add a comment
      await ApiService.addTaskComment(id as string, newComment);

      // Clear the input field
      setNewComment("");

      // Fetch latest task data including the new comment
      await fetchTaskWithComments();

      // Scroll to bottom after new comment is added
      if (chatContainerRef.current) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions for UI
  const getStatusLabel = (status: number): string => {
    const statusLabels = {
      [TaskStatus.ASSIGNED]: t("tasks.assigned") || "ASSIGNED",
      [TaskStatus.RECEIVED]: t("tasks.received") || "RECEIVED",
      [TaskStatus.IN_PROCESS]: t("tasks.inProcess") || "IN PROCESS",
      [TaskStatus.COMPLETED]: t("tasks.completed") || "COMPLETED",
    };
    return statusLabels[status as keyof typeof statusLabels] || "Unknown";
  };

  const getStatusColor = (status: number): string => {
    const statusColors = {
      [TaskStatus.ASSIGNED]: "bg-gray-200 text-gray-800",
      [TaskStatus.RECEIVED]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      [TaskStatus.IN_PROCESS]:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      [TaskStatus.COMPLETED]:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-200";
  };

  const getPriorityLabel = (priority: number): string => {
    const priorityLabels = {
      [TaskPriority.MEDIUM]: t("tasks.priorityDefault") || "MEDIUM",
      [TaskPriority.HIGH]: t("tasks.priorityHigh") || "HIGH",
    };
    return priorityLabels[priority as keyof typeof priorityLabels] || "Unknown";
  };

  const getPriorityColor = (priority: number): string => {
    const priorityColors = {
      [TaskPriority.MEDIUM]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      [TaskPriority.HIGH]:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      priorityColors[priority as keyof typeof priorityColors] || "bg-gray-200"
    );
  };

  const getUserName = (userId: number): string => {
    const user = task?.assigned_users.find((u) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : userId.toString();
  };

  const getUserInitials = (userId: number): string => {
    const user = task?.assigned_users.find((u) => u.id === userId);
    return user
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : userId.toString().substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Auto-scroll to bottom when switching to chat tab
  useEffect(() => {
    if (activeTab === "chat" && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [activeTab]);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            {error || "Task not found"}
          </h2>
          <Link href="/tasks">
            <Button>{t("tasks.backToTasks") || "Back to Tasks"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/tasks"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Tasks
          </Link>
          <h1 className="text-3xl font-bold mt-2">{task.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getStatusColor(task.status)}>
            {getStatusLabel(task.status)}
          </Badge>
          <Badge variant="outline" className={getPriorityColor(task.priority)}>
            {getPriorityLabel(task.priority)}
          </Badge>
        </div>
      </div>

      <Tabs
        defaultValue="details"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="details">
            {t("tasks.taskDetails") || "Task Details"}
          </TabsTrigger>
          <TabsTrigger value="chat">
            {t("tasks.comments") || "Chat"} ({task?.comments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("tasks.taskInformation") || "Task Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.status") || "Status"}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getStatusColor(task.status)}
                        >
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.priority") || "Priority"}
                        </h3>
                        <Badge
                          variant="outline"
                          className={getPriorityColor(task.priority)}
                        >
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.deadline") || "Deadline"}
                        </h3>
                        <p>{formatDate(task.deadline)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.createdBy") || "Created By"}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(task.created_by.id)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{`${task.created_by.first_name} ${task.created_by.last_name}`}</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.createdAt") || "Created At"}
                        </h3>
                        <p>{formatDate(task.created_at)}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.lastUpdated") || "Last Updated"}
                        </h3>
                        <p>{formatDate(task.updated_at)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">
                          {t("tasks.assignedTo") || "Assigned To"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {task.assigned_users.length > 0 ? (
                            task.assigned_users.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-2 bg-muted p-1 px-2 rounded-md"
                              >
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-xs">
                                    {getUserInitials(user.id)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{`${user.first_name} ${user.last_name}`}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground">
                              {t("tasks.noUsersAssigned") ||
                                "No users assigned"}
                            </p>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            {t("tasks.description") || "Description"}
                          </h3>
                          <p className="text-sm">
                            {task.description ||
                              t("tasks.noDescriptionProvided") ||
                              "No description provided."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <div className="relative h-[calc(100vh-200px)] md:h-[calc(80vh-200px)] flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>{t("tasks.taskChat") || "Task Chat"}</CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {task.comments.length}{" "}
                    {task.comments.length === 1
                      ? t("tasks.message") || "message"
                      : t("tasks.messages") || "messages"}
                  </Badge>
                </div>
                <Separator className="mt-4" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
                {/* Chat messages with scrollable area */}
                <div
                  ref={chatContainerRef}
                  className="flex-grow overflow-y-auto px-4 md:px-6 py-4 space-y-4 pb-20"
                >
                  {task?.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => {
                      const isCurrentUser =
                        comment.user === Number(currentUser?.id);
                      return (
                        <div
                          key={comment.id}
                          className={`flex gap-2 ${
                            isCurrentUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isCurrentUser && (
                            <Avatar className="h-7 w-7 mt-1 flex-shrink-0">
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                                {getUserInitials(comment.user)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[75%] ${
                              isCurrentUser ? "order-1" : "order-2"
                            }`}
                          >
                            <div
                              className={`p-3 rounded-lg ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm break-words">
                                {comment.message}
                              </p>
                            </div>
                            <div
                              className={`flex mt-1 text-xs text-muted-foreground ${
                                isCurrentUser ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span>
                                {formatDistanceToNow(
                                  new Date(comment.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                              {!isCurrentUser && (
                                <span className="ml-2">
                                  {getUserName(comment.user)}
                                </span>
                              )}
                            </div>
                          </div>
                          {isCurrentUser && (
                            <Avatar className="h-7 w-7 mt-1 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getUserInitials(comment.user)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("tasks.noMessages") ||
                        "No messages yet. Start the conversation!"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fixed message input form at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-background border-t shadow-md rounded-b-lg">
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("tasks.typeMessage") || "Type your message..."}
                  disabled={submitting}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  size="sm"
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t("tasks.sending") || "Sending"}
                    </span>
                  ) : (
                    t("tasks.send") || "Send"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
