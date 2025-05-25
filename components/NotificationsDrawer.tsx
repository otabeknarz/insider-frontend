"use client";

import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import ApiService from "@/lib/api";

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// Notification interface
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

// Task interface
interface Task {
  id: number;
  name: string;
  description: string;
  status: number;
  priority: number;
  deadline: string;
}

// Team interface
interface Team {
  id: number;
  name: string;
  description: string;
}

export default function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [relatedTask, setRelatedTask] = useState<Task | null>(null);
  const [relatedTeam, setRelatedTeam] = useState<Team | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await ApiService.getNotifications();

        // Handle different response formats
        if (Array.isArray(response)) {
          // If response is an array (getAll=true)
          setNotifications(response);

          // Count unread notifications
          const unread = response.filter(
            (notification: Notification) => !notification.is_read
          ).length;
          setUnreadCount(unread);
        } else if (response && response.data) {
          // If response is an AxiosResponse (getAll=false)
          setNotifications(response.data.results || []);

          // Count unread notifications
          const unread = (response.data.results || []).filter(
            (notification: Notification) => !notification.is_read
          ).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  // Fetch related task or team when a notification is selected
  useEffect(() => {
    const fetchRelatedData = async () => {
      if (!selectedNotification) return;

      setLoading(true);
      try {
        // Fetch task if available
        if (selectedNotification.task) {
          const taskResponse = await ApiService.getTask(
            selectedNotification.task.toString()
          );
          setRelatedTask(taskResponse.data);
          setRelatedTeam(null);
        }
        // Fetch team if available
        else if (selectedNotification.team) {
          // Assuming you have a getTeam method in your API service
          // If not, you'll need to add it
          const teamResponse = await ApiService.getBoard(
            selectedNotification.team.toString()
          );
          setRelatedTeam(teamResponse.data);
          setRelatedTask(null);
        } else {
          setRelatedTask(null);
          setRelatedTeam(null);
        }

        // Mark notification as read if it's not already
        if (!selectedNotification.is_read) {
          await ApiService.markNotificationAsRead(selectedNotification.id);

          // Update the notification in the local state
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === selectedNotification.id
                ? { ...notif, is_read: true }
                : notif
            )
          );

          // Update unread count
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error fetching related data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedData();
  }, [selectedNotification]);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedNotification(null);
    setRelatedTask(null);
    setRelatedTeam(null);
  };

  // Render notification content
  const renderNotificationContent = () => {
    if (!selectedNotification) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Select a notification to view details
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted/40 rounded-lg">
          <p className="font-medium">{selectedNotification.message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(selectedNotification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {relatedTask && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Related Task</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {relatedTask.name}
                  </p>
                  {relatedTask.description && (
                    <p>
                      <span className="font-medium">Description:</span>{" "}
                      {relatedTask.description}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {relatedTask.status === 1
                      ? "ASSIGNED"
                      : relatedTask.status === 2
                      ? "RECEIVED"
                      : relatedTask.status === 3
                      ? "IN PROCESS"
                      : "COMPLETED"}
                  </p>
                  <p>
                    <span className="font-medium">Priority:</span>{" "}
                    {relatedTask.priority === 1
                      ? "DEFAULT"
                      : "HIGH"}
                  </p>
                  <p>
                    <span className="font-medium">Deadline:</span>{" "}
                    {new Date(relatedTask.deadline).toLocaleDateString()}
                  </p>
                  <div className="pt-2">
                    <Link href={`/tasks/${relatedTask.id}`}>
                      <Button variant="outline" size="sm">
                        View Task
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {relatedTeam && (
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Related Team</h3>
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {relatedTeam.name}
                  </p>
                  {relatedTeam.description && (
                    <p>
                      <span className="font-medium">Description:</span>{" "}
                      {relatedTeam.description}
                    </p>
                  )}
                  <div className="pt-2">
                    <Link href={`/teams/${relatedTeam.id}`}>
                      <Button variant="outline" size="sm">
                        View Team
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Render notification list
  const renderNotificationList = () => {
    if (notifications.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No notifications
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors ${
              selectedNotification?.id === notification.id
                ? "bg-primary/10"
                : "hover:bg-muted"
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                notification.is_read ? "bg-muted-foreground" : "bg-primary"
              } mt-2`}
            ></div>
            <div className="flex-1">
              <p className="font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render the appropriate component based on screen size
  if (isDesktop) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full min-w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[80vw] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-grow">
              <div className="border-r pr-4">{renderNotificationList()}</div>
              <div className="overflow-y-auto">
                {renderNotificationContent()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full min-w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Notifications</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {selectedNotification ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2"
                  onClick={() => setSelectedNotification(null)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
                {renderNotificationContent()}
              </div>
            ) : (
              renderNotificationList()
            )}
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
