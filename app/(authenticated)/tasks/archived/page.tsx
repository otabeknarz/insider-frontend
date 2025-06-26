"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useCore } from "@/lib/core";
import { toast } from "sonner";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Home, ClipboardList, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Task,
	User,
	Team,
	TaskStatusBackend,
	TaskPriorityBackend,
} from "@/lib/types";
import { TaskSection } from "@/components/tasks/TaskSection";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Initial empty tasks array
const initialTasks: Task[] = [];

export default function ArchivedTasksPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { t } = useLanguage();
	const { user } = useAuth();
	const {
		tasks: allTasks,
		refreshTasks,
		updateTask: coreUpdateTask,
		getTasksBySpace,
		selectedSpace,
	} = useCore();

	// State for tasks
	const [tasksToMe, setTasksToMe] = useState<Task[]>(initialTasks);
	const [tasksByMe, setTasksByMe] = useState<Task[]>(initialTasks);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// State for task drawer
	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
	const [drawerTask, setDrawerTask] = useState<Task | null>(null);

	// State for delete dialog
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
	const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

	// State for task dialog
	const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
	const [dialogTask, setDialogTask] = useState<Task | null>(null);

	// State for drag and drop
	const [draggedTask, setDraggedTask] = useState<Task | null>(null);

	// Initial load effect - ensures tasks are loaded when the component mounts
	useEffect(() => {
		console.log("Initial archived tasks loading effect triggered");
		if (!allTasks.length) {
			console.log("No tasks in CoreContext, forcing refresh for archived page");
			refreshTasks().then(() => {
				console.log("Tasks refreshed from API for archived page");
				fetchTasks();
			});
		} else {
			fetchTasks();
		}
	}, []); // Empty dependency array ensures this runs once on mount

	// Re-fetch tasks when selectedSpace or allTasks changes
	useEffect(() => {
		console.log("Selected space or tasks changed, fetching archived tasks");
		fetchTasks();
	}, [selectedSpace, allTasks.length]);

	// Fetch tasks from CoreContext
	const fetchTasks = async () => {
		try {
			setLoading(true);
			setError(null);

			// Only refresh tasks from CoreContext if we need to
			if (!allTasks.length) {
				await refreshTasks();
			}

			if (selectedSpace) {
				// Get tasks filtered by the selected space
				const spaceTasks = getTasksBySpace(selectedSpace.id);

				// Filter tasks assigned to the user and only get archived ones (COMPLETED status)
				const archivedToMeTasks = spaceTasks.filter((task) => {
					if (!task.assigned_users || !user?.id) return false;

					// Check if task is assigned to current user
					const isAssignedToUser = task.assigned_users.some((u) => {
						// If u is a string (user ID)
						if (typeof u === "string") {
							return u === user.id.toString();
						}

						// If u is a User object with id
						if (u && typeof u === "object" && u.id) {
							return u.id.toString() === user.id.toString();
						}

						return false;
					});

					// Only return tasks that are assigned to user AND have COMPLETED status
					return (
						isAssignedToUser && task.status === TaskStatusBackend.COMPLETED
					);
				});
				setTasksToMe(archivedToMeTasks);
				console.log(
					`Found ${archivedToMeTasks.length} archived tasks assigned to me`
				);

				// Filter tasks created by the user and only get archived ones
				const archivedByMeTasks = spaceTasks.filter((task) => {
					if (!user?.id || !task.created_by) return false;

					// Check if task was created by current user
					let isCreatedByUser = false;
					// If created_by is a string (user ID)
					if (typeof task.created_by === "string") {
						isCreatedByUser = task.created_by === user.id.toString();
					}

					// If created_by is a User object with id
					if (typeof task.created_by === "object" && task.created_by.id) {
						isCreatedByUser =
							task.created_by.id.toString() === user.id.toString();
					}

					// Only return tasks that are created by user AND have COMPLETED status
					return isCreatedByUser && task.status === TaskStatusBackend.COMPLETED;
				});
				setTasksByMe(archivedByMeTasks);
				console.log(
					`Found ${archivedByMeTasks.length} archived tasks created by me`
				);
			}

			setError(null);
		} catch (error) {
			console.error("Error fetching tasks:", error);
			setError(t("tasks.fetchError") || "Failed to fetch tasks");
		} finally {
			setLoading(false);
		}
	};

	// Handle unarchiving a task
	const handleUnarchiveTask = async (task: Task, event?: React.MouseEvent) => {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		try {
			// Update task status to TODO (1) to mark it as unarchived
			const updatedTask = await coreUpdateTask(task.id, {
				status: 1, // TaskStatusBackend.TODO
			} as any);

			console.log("Task unarchived successfully:", updatedTask);

			// Update the local state to remove the unarchived task
			const isTaskByMe =
				typeof task.created_by === "string"
					? task.created_by === user?.id?.toString()
					: task.created_by?.id?.toString() === user?.id?.toString();

			const isTaskToMe = task.assigned_users?.some((u) => {
				if (typeof u === "string") return u === user?.id?.toString();
				return u?.id?.toString() === user?.id?.toString();
			});

			// Remove task from the appropriate list
			if (isTaskByMe) {
				setTasksByMe((prev) => prev.filter((t) => t.id !== task.id));
			}

			if (isTaskToMe) {
				setTasksToMe((prev) => prev.filter((t) => t.id !== task.id));
			}

			// Show success message
			toast.success(
				t("tasks.unarchivedSuccess") || "Task unarchived successfully"
			);
		} catch (error) {
			console.error("Error unarchiving task:", error);
			toast.error(t("tasks.unarchiveError") || "Failed to unarchive task");
		}
	};

	// Handle priority change for mobile devices
	const handlePriorityChange = async (task: Task, newPriority: number) => {
		try {
			// Update task priority using CoreContext
			const updatedTask = await coreUpdateTask(task.id, {
				priority: newPriority,
			} as any);

			console.log("Task priority updated successfully:", updatedTask);

			// Update local state
			const isTaskByMe =
				typeof task.created_by === "string"
					? task.created_by === user?.id?.toString()
					: task.created_by?.id?.toString() === user?.id?.toString();

			const isTaskToMe = task.assigned_users?.some((u) => {
				if (typeof u === "string") return u === user?.id?.toString();
				return u?.id?.toString() === user?.id?.toString();
			});

			// Update the appropriate task list
			if (isTaskByMe) {
				setTasksByMe((prev) =>
					prev.map((t) =>
						t.id === task.id ? { ...t, priority: newPriority } : t
					)
				);
			}

			if (isTaskToMe) {
				setTasksToMe((prev) =>
					prev.map((t) =>
						t.id === task.id ? { ...t, priority: newPriority } : t
					)
				);
			}
		} catch (error) {
			console.error("Error updating task priority:", error);
			toast.error(
				t("tasks.priorityUpdateError") || "Failed to update priority"
			);
		}
	};

	return (
		<div className="container py-6 space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb className="mb-6">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink className="flex items-center" href="/">
							<Home className="h-4 w-4 mr-1" />
							{t("breadcrumb.home") || "Home"}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink className="flex items-center" href="/tasks">
							<ClipboardList className="h-4 w-4 mr-1" />
							{t("breadcrumb.tasks") || "Tasks"}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage className="flex items-center">
							<Archive className="h-4 w-4 mr-1" />
							{t("breadcrumb.archived") || "Archived"}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">
					{t("tasks.archivedTasks") || "Archived Tasks"}
				</h1>
				<Button variant="outline" onClick={() => router.push("/tasks")}>
					<ClipboardList className="mr-2 h-4 w-4" />
					{t("tasks.activeTasks") || "Active Tasks"}
				</Button>
			</div>

			<Tabs defaultValue="to-me" className="w-full">
				<TabsList className="mb-4">
					<TabsTrigger value="to-me">
						{t("tasks.assignedToMe") || "Assigned to Me"}
					</TabsTrigger>
					<TabsTrigger value="by-me">
						{t("tasks.createdByMe") || "Created by Me"}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="to-me">
					<TaskSection
						tasks={tasksToMe}
						loading={loading}
						error={error}
						onAddTask={() => {}}
						onEditTask={() => {}}
						onDeleteTask={() => {}}
						onDragStart={() => {}}
						onDragOver={() => {}}
						onDrop={() => {}}
						isTasksCreatedByMe={false}
						onPriorityChange={handlePriorityChange}
						onArchiveTask={handleUnarchiveTask}
						title={
							t("tasks.archivedAssignedToMe") || "Archived Tasks Assigned to Me"
						}
					/>
				</TabsContent>
				<TabsContent value="by-me">
					<TaskSection
						tasks={tasksByMe}
						loading={loading}
						error={error}
						onAddTask={() => {}}
						onEditTask={() => {}}
						onDeleteTask={() => {}}
						onDragStart={() => {}}
						onDragOver={() => {}}
						onDrop={() => {}}
						isTasksCreatedByMe={true}
						onPriorityChange={handlePriorityChange}
						onArchiveTask={handleUnarchiveTask}
						title={
							t("tasks.archivedCreatedByMe") || "Archived Tasks Created by Me"
						}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
