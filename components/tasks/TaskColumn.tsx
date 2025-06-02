import React, { useState } from "react";
import { Task, User } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import ApiService from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLanguage } from "@/lib/language-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  status: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task, event?: React.MouseEvent) => void;
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (status: number) => void;
  isTasksCreatedByMe?: boolean; // Indicates if tasks in this column were created by the current user
  onPriorityChange?: (task: Task, newPriority: number) => void; // For mobile priority changes
}

export function TaskColumn({
  title,
  tasks,
  status,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isTasksCreatedByMe = false,
  onPriorityChange,
}: TaskColumnProps) {
  const { t } = useLanguage();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // State for assigned users modal/drawer
  const [showAllAssignedUsers, setShowAllAssignedUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullTasksData, setFullTasksData] = useState<Task[]>([]);
  
  // Function to fetch full task data for all tasks in this column
  const fetchAllTasksData = async () => {
    if (tasks.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const taskPromises = tasks.map(task => 
        ApiService.getTask(task.id.toString())
          .then(response => response.data)
          .catch(err => {
            console.error(`Error fetching task ${task.id}:`, err);
            return null;
          })
      );
      
      const results = await Promise.all(taskPromises);
      const validResults = results.filter(task => task !== null) as Task[];
      
      setFullTasksData(validResults);
    } catch (err) {
      console.error("Error fetching tasks details:", err);
      setError("Failed to load tasks details");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle opening the assigned users view
  const handleViewAssignedUsers = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetchAllTasksData();
    setShowAllAssignedUsers(true);
  };
  
  // Get initials for avatar
  const getInitials = (user: User) => {
    if (!user) return "?";
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
    return initials.toUpperCase() || "?";
  };
  
  // Count total assigned users across all tasks
  const totalAssignedUsers = tasks.reduce((total, task) => {
    return total + (task.assigned_users?.length || 0);
  }, 0);
  return (
    <>
      <div
        className="bg-muted/30 rounded-lg p-4"
        onDragOver={onDragOver}
        onDrop={() => onDrop(status)}
      >
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">{title}</h2>
        <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            isCreatedByMe={isTasksCreatedByMe}
            onPriorityChange={onPriorityChange}
          />
        ))}
      </div>
      
      {/* No global button needed as each task has its own button */}
    </div>
    
    {/* Assigned Users Dialog (Desktop) */}
    {isDesktop ? (
        <Dialog open={showAllAssignedUsers} onOpenChange={(open) => {
          if (!open) setShowAllAssignedUsers(false);
        }}>
          <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>{t("tasks.assignedUsers") || "Assigned Users"}</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("tasks.loadingUsers") || "Loading users..."}
                  </p>
                </div>
              ) : error ? (
                <div className="text-sm text-destructive p-4 rounded-md bg-destructive/10">
                  {error}
                </div>
              ) : fullTasksData.length > 0 ? (
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-6 px-1 py-2">
                    {fullTasksData.map((task) => (
                      <div key={task.id} className="space-y-3">
                        <h3 className="text-sm font-medium border-b pb-1">{task.name}</h3>
                        {task.assigned_users && task.assigned_users.length > 0 ? (
                          <div className="space-y-2">
                            {task.assigned_users.map((user) => (
                              <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{`${user.first_name} ${user.last_name}`}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    @{user.username} • {user.position?.name || ""}
                                  </p>
                                </div>
                                {user.region && (
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                    {user.region?.name || ""}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {t("tasks.noAssignedUsers") || "No assigned users"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("tasks.noAssignedUsers") || "No assigned users found"}
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        /* Assigned Users Drawer (Mobile) */
        <Drawer open={showAllAssignedUsers} onOpenChange={(open) => {
          if (!open) setShowAllAssignedUsers(false);
        }}>
          <DrawerContent>
            <DrawerHeader className="border-b">
              <DrawerTitle>{t("tasks.assignedUsers") || "Assigned Users"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 py-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t("tasks.loadingUsers") || "Loading users..."}
                  </p>
                </div>
              ) : error ? (
                <div className="text-sm text-destructive p-4 rounded-md bg-destructive/10">
                  {error}
                </div>
              ) : fullTasksData.length > 0 ? (
                <div className="space-y-6 py-2">
                  {fullTasksData.map((task) => (
                    <div key={task.id} className="space-y-3">
                      <h3 className="text-sm font-medium border-b pb-1">{task.name}</h3>
                      {task.assigned_users && task.assigned_users.length > 0 ? (
                        <div className="space-y-2">
                          {task.assigned_users.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getInitials(user)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{`${user.first_name} ${user.last_name}`}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  @{user.username} • {user.position?.name || ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {t("tasks.noAssignedUsers") || "No assigned users"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t("tasks.noAssignedUsers") || "No assigned users found"}
                </p>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}