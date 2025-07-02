"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import ApiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import { TaskStatusBackend, TaskPriorityBackend } from "@/lib/types";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Pencil, ArrowLeft, ArrowRight, MessageCircle, Users, Home, ClipboardList } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";


// Task and Comment interfaces
import { Task, User } from "@/lib/types";

// Extended Comment interface to match the API response
interface Comment {
  id: number;
  user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    position: {
      id: string;
      name: string;
    } | null;
    region: {
      id: number;
      name: string;
    } | null;
    district: {
      id: number;
      name: string;
      region: number;
    } | null;
    created_at: string;
    updated_at: string;
    date_joined: string;
  };
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: string | number;
}

// Define Team interface for the API response
interface TeamDetail {
  id: string;
  owner: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    position: {
      id: string;
      name: string;
    } | null;
    region: {
      id: number;
      name: string;
    } | null;
    district: {
      id: number;
      name: string;
      region: number;
    } | null;
    created_at: string;
    updated_at: string;
    date_joined: string;
  };
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  admins: string[];
  members: string[];
}

// Extend Task interface but override the team property for the detail view
interface TaskDetailResponse extends Omit<Task, 'team'> {
  team: TeamDetail | null;
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [task, setTask] = useState<TaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // State for assigned users drawer/dialog
  const [showAssignedUsers, setShowAssignedUsers] = useState(false);
  
  // Check if the device is desktop
  const isDesktop = useMediaQuery("(min-width: 768px)");





  // Helper functions for UI
  const getStatusLabel = (status: number): string => {
    const statusLabels = {
      [TaskStatusBackend.ASSIGNED]: t("tasks.assigned") || "ASSIGNED",
      [TaskStatusBackend.RECEIVED]: t("tasks.received") || "RECEIVED",
      [TaskStatusBackend.IN_PROCESS]: t("tasks.inProcess") || "IN PROCESS",
      [TaskStatusBackend.COMPLETED]: t("tasks.completed") || "COMPLETED",
    };
    return statusLabels[status as keyof typeof statusLabels] || "Unknown";
  };

  const getStatusColor = (status: number): string => {
    const statusColors = {
      [TaskStatusBackend.ASSIGNED]: "bg-gray-200 text-gray-800",
      [TaskStatusBackend.RECEIVED]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      [TaskStatusBackend.IN_PROCESS]:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      [TaskStatusBackend.COMPLETED]:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-200";
  };

  const getPriorityLabel = (priority: number): string => {
    const priorityLabels = {
      [TaskPriorityBackend.MEDIUM]: t("tasks.priorityDefault") || "MEDIUM",
      [TaskPriorityBackend.HIGH]: t("tasks.priorityHigh") || "HIGH",
    };
    return priorityLabels[priority as keyof typeof priorityLabels] || "Unknown";
  };

  const getPriorityColor = (priority: number): string => {
    const priorityColors = {
      [TaskPriorityBackend.MEDIUM]:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      [TaskPriorityBackend.HIGH]:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      priorityColors[priority as keyof typeof priorityColors] || "bg-gray-200"
    );
  };

  const getUserInitials = (user: User | number): string => {
    if (typeof user === 'number') {
      // If user is an ID, find the user object in assigned_user
      if (!task?.assigned_user || !Array.isArray(task.assigned_user)) return "";
      
      // Handle the case where assigned_user might contain user objects or just string IDs
      const userObj = task.assigned_user.find((u: string | User) => {
        if (typeof u === 'string') {
          return Number(u) === user;
        } else if (typeof u === 'object' && u !== null) {
          return Number(u.id) === user;
        }
        return false;
      });
      
      if (!userObj) return "";
      
      // Handle the case where userObj might be a string ID or a User object
      if (typeof userObj === 'string') {
        // If it's just a string ID, we can't get initials
        return "";
      } else {
        // If it's a User object, get initials from first_name and last_name
        const userAsObj = userObj as User;
        return `${userAsObj.first_name?.[0] || ""}${userAsObj.last_name?.[0] || ""}`;
      }
    }
    // If user is already a User object
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`;
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
          <Button asChild>
            <Link href="/tasks" className="flex items-center gap-2">
              {t("tasks.backToTasks") || "Back to Tasks"}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center gap-1" href="/">
              <Home className="h-4 w-4 mr-1" />
              {t("common.home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center gap-1" href="/tasks">
              <ClipboardList className="h-4 w-4 mr-1" />
              {t("tasks.title")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {task?.name || t("tasks.taskDetails")}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-6 gap-2">
        <div>
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

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="hidden">  
          <TabsTrigger value="details">{t("tasks.details") || "Details"}</TabsTrigger>
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
                              {task.created_by.first_name.charAt(0).toUpperCase() + task.created_by.last_name.charAt(0).toUpperCase()}
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
                        <div className="flex flex-wrap gap-2 mb-2">
                          {task?.assigned_user && Array.isArray(task.assigned_user) && task.assigned_user.length > 0 ? (
                            <>
                              <div className="flex flex-wrap gap-2">
                                {task.assigned_user.slice(0, 3).map((user: User | string) => {
                                  // Skip string IDs, only render User objects
                                  if (typeof user === 'string') return null;
                                  return (
                                  <div
                                    key={user.id}
                                    className="flex items-center gap-2 bg-muted p-1 px-2 rounded-md"
                                  >
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-xs">
                                        {user.first_name.charAt(0).toUpperCase() + user.last_name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{`${user.first_name} ${user.last_name}`}</span>
                                  </div>
                                );
                                })}
                                {task.assigned_user.length > 3 && (
                                  <div className="flex items-center gap-2 bg-muted p-1 px-2 rounded-md">
                                    <span className="text-sm">+{task.assigned_user.length - 3} more</span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="mt-2"
                                onClick={() => setShowAssignedUsers(true)}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                {t("tasks.viewAllAssigned") || "View All Assigned Users"}
                              </Button>
                            </>
                          ) : (
                            <p className="text-muted-foreground">
                              {t("tasks.noUsersAssigned") ||
                                "No users assigned"}
                            </p>
                          )}
                        </div>
                      </div>

                      {task.team && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">
                            {t("tasks.team") || "Team"}
                          </h3>
                          <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                            <div className="flex-1">
                              <p className="font-medium">{task.team.name}</p>
                              {task.team.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {task.team.description}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/teams/${task.team.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}

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
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => router.push('/tasks')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("common.back") || "Back"}
                  </Button>
                  <Button 
                    onClick={() => router.push(`/tasks/${id}/chat`)}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("tasks.openChat") || "Open Chat"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    
      {/* Drawer for mobile devices */}
      {!isDesktop && task && (
        <Drawer open={showAssignedUsers} onOpenChange={setShowAssignedUsers}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("tasks.assignedUsers") || "Assigned Users"}</DrawerTitle>
              <DrawerDescription>
                {t("tasks.assignedUsersDescription") || "Users assigned to this task"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <ScrollArea className="h-[50vh]">
                <div className="space-y-4">
                  {task && task.assigned_user && Array.isArray(task.assigned_user) && task.assigned_user.length > 0 ? (
                    task.assigned_user.map((user: User | string) => {
                      // Skip string IDs, only render User objects
                      if (typeof user === 'string') return null;
                      return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {user.first_name.charAt(0).toUpperCase() + user.last_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{`${user.first_name} ${user.last_name}`}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          {user.position && (
                            <p className="text-xs text-muted-foreground mt-1">{user.position.name}</p>
                          )}
                        </div>
                      </div>
                    );
                    })
                  ) : (
                    <p className="text-center py-4 text-muted-foreground">
                      {t("tasks.noUsersAssigned") || "No users assigned to this task"}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">{t("common.close") || "Close"}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Dialog for desktop */}
      {isDesktop && task && (
        <Dialog open={showAssignedUsers} onOpenChange={setShowAssignedUsers}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("tasks.assignedUsers") || "Assigned Users"}</DialogTitle>
              <DialogDescription>
                {t("tasks.assignedUsersDescription") || "Users assigned to this task"}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] mt-4">
              <div className="space-y-4">
                {task && task.assigned_user && Array.isArray(task.assigned_user) && task.assigned_user.length > 0 ? (
                  task.assigned_user.map((user: User | string) => {
                    // Skip string IDs, only render User objects
                    if (typeof user === 'string') return null;
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border-b border-border/50 last:border-0"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {user.first_name.charAt(0).toUpperCase() + user.last_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{`${user.first_name} ${user.last_name}`}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          {user.position && (
                            <p className="text-xs text-muted-foreground mt-1">{user.position.name}</p>
                          )}
                          {user.region && (
                            <p className="text-xs text-muted-foreground">{user.region.name}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    {t("tasks.noUsersAssigned") || "No users assigned to this task"}
                  </p>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowAssignedUsers(false)}>
                {t("common.close") || "Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
