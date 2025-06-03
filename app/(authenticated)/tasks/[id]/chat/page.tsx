"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ApiService from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import { isSameDay, format } from "date-fns";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Comment, Task, User } from "@/lib/types";

// Extended Comment interface that includes the full user object instead of just user ID
interface CommentWithUser extends Omit<Comment, "user"> {
  user: User;
}

// Extended Task interface that includes comments with full user objects
interface TaskDetailResponse extends Omit<Task, 'comments'> {
  comments: CommentWithUser[];
}

// formatDate function is defined inside the component

export default function TaskChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [task, setTask] = useState<TaskDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Reference to chat container for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch task details
  async function fetchTaskWithComments() {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await ApiService.request<TaskDetailResponse>({
        method: 'get',
        url: `/api/core/tasks/${id}/`
      });
      setTask(response.data);
    } catch (err) {
      console.error("Error fetching task:", err);
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }

  // Submit a new comment
  async function handleSubmitComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!newComment.trim() || submitting || !id || !currentUser) return;
    
    // Optimistically add the message to UI before API call completes
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentWithUser = {
      id: tempId as unknown as number,
      user: currentUser as unknown as User,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: newComment,
      is_read: true,
      task: Number(id)
    };
    
    // Add optimistic comment to UI
    setTask(prevTask => {
      if (!prevTask) return null;
      
      return {
        ...prevTask,
        comments: [...(prevTask.comments || []), optimisticComment],
      };
    });
    
    // Clear the input immediately for better UX
    setNewComment("");
    
    // Scroll to bottom after adding new message
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
    
    setSubmitting(true);
    
    try {
      const response = await ApiService.request<CommentWithUser>({
        method: 'post',
        url: `/api/core/tasks/${id}/comments/`,
        data: {
          message: optimisticComment.message,
        }
      });
      
      // Replace the optimistic comment with the real one from the server
      setTask(prevTask => {
        if (!prevTask) return null;
        
        return {
          ...prevTask,
          comments: prevTask.comments.map(c => 
            c.id.toString() === tempId ? response.data : c
          ),
        };
      });
    } catch (err) {
      console.error("Error posting comment:", err);
      
      // Remove the optimistic comment on error
      setTask(prevTask => {
        if (!prevTask) return null;
        
        return {
          ...prevTask,
          comments: prevTask.comments.filter(c => c.id.toString() !== tempId),
        };
      });
      
      // Show error message
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  // Format date for message grouping
  function formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, today)) {
      return t("chat.today") || "Today";
    } else if (isSameDay(date, yesterday)) {
      return t("chat.yesterday") || "Yesterday";
    } else {
      return format(date, "MMM d, yyyy");
    }
  }

  // Load task data on component mount
  useEffect(() => {
    fetchTaskWithComments();
  }, [id]);

  // Set page title and scroll to bottom on initial load
  useEffect(() => {
    if (task) {
      document.title = `Chat - ${task.name} | Insider`;
      
      // Scroll to bottom when messages are loaded
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
    return () => {
      document.title = 'Insider';
    };
  }, [task]);
  
  // Add keyboard shortcut to submit message with Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && newComment.trim() && !submitting) {
        e.preventDefault();
        const form = document.getElementById('chat-form') as HTMLFormElement;
        if (form) form.requestSubmit();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newComment, submitting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchTaskWithComments} className="mt-3" variant="outline" size="sm">
            {t("common.tryAgain") || "Try Again"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background fixed inset-0 w-full pb-[64px] sm:pb-0">
      {/* Header */}
      <div className="flex items-center px-4 py-2 border-b bg-background/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label={t("common.back") || "Back"}
          className="mr-3 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-medium">{task?.name || t("chat.taskChat") || "Task Chat"}</h2>
        </div>
      </div>

      {/* Chat messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 space-y-2 py-3 max-w-3xl mx-auto w-full scrollbar-hide"
      >
        {/* Empty state when no messages */}
        {task?.comments?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">{t("chat.noMessages") || "No messages yet"}</h3>
            <p className="text-muted-foreground text-sm">
              {t("chat.startConversation") || "Start the conversation about this task"}
            </p>
          </div>
        )}
        {task?.comments && task.comments.length > 0 ? (
          <>
            {/* Sort messages to ensure oldest first (top to bottom) */}
            {[...task.comments]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .reduce((acc: React.ReactNode[], message, index, sortedMessages) => {
                const messageDate = new Date(message.created_at);
                const isCurrentUser = String(message.user.id) === String(currentUser?.id);
                
                // Check if we need a date separator
                if (index === 0 || !isSameDay(messageDate, new Date(sortedMessages[index - 1].created_at))) {
                  acc.push(
                    <div key={`date-${message.id || index}`} className="flex items-center my-6">
                      <div className="flex-grow h-px bg-border"></div>
                      <span className="px-4 py-1 text-xs font-medium text-muted-foreground bg-background rounded-full border">
                        {formatDate(messageDate)}
                      </span>
                      <div className="flex-grow h-px bg-border"></div>
                    </div>
                  );
                }
                
                // Add the message
                acc.push(
                  <div
                    key={message.id.toString() || index.toString()}
                    className={cn(
                      "flex mb-2",
                      isCurrentUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "flex max-w-[80%]",
                      isCurrentUser ? "justify-end ml-auto" : "justify-start"
                    )}>
                      <div className="flex flex-col gap-1">
                        {!isCurrentUser && (
                          <span className="text-xs text-muted-foreground">
                            {message.user.first_name} {message.user.last_name}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-md text-sm break-words max-w-full",
                            isCurrentUser
                              ? "bg-primary/90 text-primary-foreground rounded-tr-none"
                              : "bg-muted/80 rounded-tl-none"
                          )}
                        >
                          {message.message}
                        </div>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground self-end cursor-default">
                                {new Date(message.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {new Date(message.created_at).toLocaleString('en-US', {
                                timeStyle: 'medium',
                                hour12: true
                              })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
                
                return acc;
              }, [])}
          </>
        ) : null}
      </div>

      {/* Message input */}
      <div className="border-t py-2 px-3 bg-background/90 backdrop-blur-sm sticky left-0 right-0 z-10">
        <form id="chat-form" onSubmit={handleSubmitComment} className="flex items-center gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("chat.typePlaceholder") || "Type a message..."}
              disabled={submitting}
              type="text"
              className="flex-1 pr-9 py-2 rounded-md bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              autoComplete="off"
            />
            <Button 
              type="submit" 
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md p-0"
              variant={newComment.trim() ? "default" : "ghost"}
              disabled={submitting || !newComment.trim()}
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
