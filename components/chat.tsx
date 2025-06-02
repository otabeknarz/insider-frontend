"use client"

import * as React from "react"
import { FormEvent, RefObject, useState, useEffect } from "react"
import { ArrowUpIcon } from "lucide-react"
import { formatDistanceToNow, format, isSameDay } from "date-fns"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command"
import { CheckIcon, PlusIcon } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { User } from "@/lib/types"

export interface ChatMessage {
  id: number | string
  user: {
    id: string
    username: string
    first_name: string
    last_name: string
    position: {
      id: string
      name: string
    } | null
    region: {
      id: number
      name: string
    } | null
    district: {
      id: number
      name: string
      region: number
    } | null
    created_at: string
    updated_at: string
    date_joined: string
  }
  message: string
  created_at: string
  updated_at: string
  is_read: boolean
  task: string | number
}

export interface ChatProps {
  messages: ChatMessage[]
  currentUserId: number | string
  title: string
  messageCount: number
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  inputValue: string
  onInputChange: (value: string) => void
  submitting: boolean
  chatContainerRef: RefObject<HTMLDivElement>
  emptyMessage: string
  getUserInitials: (userId: number | string) => string
  getUserName: (userId: number | string) => string
  users: User[]
  onInviteUsers?: (userIds: number[]) => Promise<void>
  taskId?: string
}

// Helper function to format date for message separators
const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(date, today)) {
    return "Today";
  } else if (isSameDay(date, yesterday)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d, yyyy");
  }
};

export function Chat({
  messages,
  currentUserId,
  title,
  messageCount,
  onSubmit,
  inputValue,
  onInputChange,
  submitting,
  chatContainerRef,
  emptyMessage,
  getUserInitials,
  getUserName,
  users,
  onInviteUsers,
  taskId
}: ChatProps) {
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  
  // Scroll to bottom when messages change or when component mounts
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 200); // Increased timeout to ensure all content is rendered
    }
  }, [messages, chatContainerRef]);
  
  // Also scroll to bottom on initial render
  useEffect(() => {
    if (chatContainerRef.current && messages.length > 0) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 500); // Longer timeout for initial render
    }
  }, []);

  return (
    <>
    <Card className="relative">
      <CardHeader className="flex flex-row items-center">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm leading-none font-medium">{title}</p>
            <p className="text-muted-foreground text-xs">{messageCount} messages</p>
          </div>
        </div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="ml-auto size-8 rounded-full"
                onClick={() => setOpen(true)}
              >
                <PlusIcon />
                <span className="sr-only">New message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={10}>New message</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent>
        <div ref={chatContainerRef} className="flex flex-col gap-4 h-[calc(100vh-400px)] overflow-y-auto p-2">
          {messages.length > 0 ? (
            <>
              {/* Sort messages to ensure oldest first (top to bottom) */}
              {[...messages]
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .reduce((acc: React.ReactNode[], message, index, sortedMessages) => {
                  const messageDate = new Date(message.created_at);
                  const isCurrentUser = message.user.id === currentUserId;
                  
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
                      key={message.id || index}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                        isCurrentUser
                          ? "bg-primary text-primary-foreground self-end max-w-[80%]" // Current user's messages
                          : "bg-muted self-start max-w-[80%]" // Other users' messages
                      )}
                    >
                      <div className="flex flex-col w-full">
                        {/* Show user name and avatar for other users' messages */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                              {typeof message.user === 'object' 
                                ? `${message.user.first_name?.[0] || ''}${message.user.last_name?.[0] || ''}`.toUpperCase() 
                                : getUserInitials(message.user)}
                            </div>
                            <span className="text-xs font-medium">
                              {typeof message.user === 'object' 
                                ? `${message.user.first_name} ${message.user.last_name}` 
                                : getUserName(message.user)}
                            </span>
                          </div>
                        )}
                        
                        {/* Message content */}
                        <div className="break-words">{message.message}</div>
                        
                        {/* Timestamp */}
                        <span className={cn(
                          "text-xs opacity-70 mt-1",
                          isCurrentUser ? "text-right" : "text-left"
                        )}>
                          {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                  
                  return acc;
                }, [])
              }
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center">{emptyMessage}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (inputValue.trim().length === 0) return
            onSubmit(event)
          }}
          className="relative w-full"
        >
          <Input
            id="message"
            placeholder="Type your message..."
            className="flex-1 pr-10"
            autoComplete="off"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-2 size-6 -translate-y-1/2 rounded-full"
            disabled={inputValue.trim().length === 0 || submitting}
          >
            <ArrowUpIcon className="size-3.5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 p-0 outline-none">
        <DialogHeader className="px-4 pt-5 pb-4">
          <DialogTitle>Invite Users to Task</DialogTitle>
          <DialogDescription>
            Invite users to collaborate on this task. They will be able to view and comment on this task.
          </DialogDescription>
        </DialogHeader>
        <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
          <CommandInput placeholder="Search user..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.email}
                  data-active={selectedUsers.includes(user)}
                  className="data-[active=true]:opacity-50"
                  onSelect={() => {
                    if (selectedUsers.includes(user)) {
                      return setSelectedUsers(
                        selectedUsers.filter(
                          (selectedUser) => selectedUser !== user
                        )
                      )
                    }

                    return setSelectedUsers(
                      [...users].filter((u) =>
                        [...selectedUsers, user].includes(u)
                      )
                    )
                  }}
                >
                  <Avatar className="border">
                    <AvatarFallback>{user.get_full_name?.()[0]}</AvatarFallback>
                  </Avatar>
                  <div className="ml-2">
                    <p className="text-sm leading-none font-medium">
                      {user.get_full_name?.()}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {user.email}
                    </p>
                  </div>
                  {selectedUsers.includes(user) ? (
                    <CheckIcon className="text-primary ml-auto flex size-4" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
          {selectedUsers.length > 0 ? (
            <div className="flex -space-x-2 overflow-hidden">
              {selectedUsers.map((user) => (
                <Avatar key={user.email} className="inline-block border">
                  <AvatarFallback>{user.get_full_name?.()[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Select users to add to this thread.
            </p>
          )}
          <Button
            disabled={selectedUsers.length === 0}
            size="sm"
            onClick={async () => {
              if (onInviteUsers && selectedUsers.length > 0) {
                try {
                  // Extract user IDs from selected users
                  const userIds = selectedUsers.map(user => Number(user.id));
                  await onInviteUsers(userIds);
                  setSelectedUsers([]);
                  setOpen(false);
                } catch (error) {
                  console.error('Error inviting users:', error);
                  alert('Failed to invite users. Please try again.');
                }
              } else {
                setOpen(false);
              }
            }}
            className="bg-primary hover:bg-primary/90"
          >
            {submitting ? 'Inviting...' : 'Invite Users'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}