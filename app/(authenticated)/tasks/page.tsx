"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Button } from "@/components/ui/button";
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
	Task as BackendTask,
	User,
	Team,
	TaskStatusBackend,
	TaskPriorityBackend,
	TaskFormData,
	Space,
} from "@/lib/types";
import { TaskSection } from "@/components/tasks/TaskSection";

// Import our new components
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useCore } from "@/lib/core";

// Initial empty tasks array
const initialTasks: BackendTask[] = [];

export default function TasksPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { t } = useLanguage();

	// Use CoreContext for tasks, spaces, and teams
	const {
		tasks: allTasks,
		refreshTasks,
		spaces,
		selectedSpace,
		setSelectedSpace,
		getTasksBySpace,
		teams,
		selectedTeam,
		setSelectedTeam,
		users: coreUsers,
		loading: coreLoading,
		error: coreError,
		addTask: coreAddTask,
		updateTask: coreUpdateTask,
		deleteTask: coreDeleteTask,
	} = useCore();

	// Check if we have an edit parameter in the URL
	const editTaskId = searchParams.get("edit");

	// Get proper translations with fallbacks for key labels
	const nameLabel = t("tasks.name") === "tasks.name" ? "Name" : t("tasks.name");
	const teamLabel = t("tasks.team") === "tasks.team" ? "Team" : t("tasks.team");
	const assignedUsersLabel =
		t("tasks.assignedUsers") === "tasks.assignedUsers"
			? "Assigned Users"
			: t("tasks.assignedUsers");
	const addTaskLabel =
		t("tasks.addTask") === "tasks.addTask" ? "Add Task" : t("tasks.addTask");
	const tasksTitle =
		t("tasks.title") === "tasks.title" ? "Tasks" : t("tasks.title");

	const { user } = useAuth();

	const [tasksToMe, setTasksToMe] = useState<BackendTask[]>(initialTasks);
	const [tasksByMe, setTasksByMe] = useState<BackendTask[]>(initialTasks);

	// State for active tasks
	const [activeTasksToMe, setActiveTasksToMe] =
		useState<BackendTask[]>(initialTasks);
	const [activeTasksByMe, setActiveTasksByMe] =
		useState<BackendTask[]>(initialTasks);
	const [draggedTask, setDraggedTask] = useState<BackendTask | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Local state for UI
	const [teamSearch, setTeamSearch] = useState("");
	const [loadingTeams, setLoadingTeams] = useState(false);

	const [userSearch, setUserSearch] = useState("");
	const [isMobile, setIsMobile] = useState(false);

	// Legacy interface retained temporarily for reference; not used
	/* interface _DeprecatedLocalFormData {
		name: string;
		description: string;
		status: number;
		is_checked: boolean;
		priority: number;
		team: number | null;
		assigned_user: string | null; // single assignee (legacy)
		assigned_user: string[]; // multiple assignees (preferred)
		deadline: string;
	} */

	const [formData, setFormData] = useState<TaskFormData>({
		name: "",
		description: "",
		status: TaskStatusBackend.ASSIGNED,
		is_checked: false,
		priority: TaskPriorityBackend.MEDIUM,
		team: null,
		assigned_user: [],
		deadline: "",
	});
	const [users, setUsers] = useState<User[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [savingTask, setSavingTask] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<BackendTask | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Get tasks from CoreContext based on selected space
	const fetchTasks = async () => {
		try {
			setLoading(true);

			// Only refresh tasks from CoreContext if we need to
			if (!allTasks.length) {
				await refreshTasks();
			}

			// If no selected space but we have spaces, select the first one
			if (!selectedSpace && spaces.length > 0) {
				const defaultSpace = spaces.find((s) => s.id === "all") || spaces[0];
				setSelectedSpace(defaultSpace);
				return; // This will trigger a re-render and this function will run again
			}

			// If we still don't have a selected space, show empty state
			if (!selectedSpace) {
				setTasksToMe([]);
				setTasksByMe([]);
				return;
			}

			// Get tasks filtered by the selected space
			const spaceTasks = getTasksBySpace(selectedSpace.id);

			// Filter tasks assigned to the user
			const toMeTasks = spaceTasks.filter((task) => {
				if (!task) return false;
				if (!user?.id) return false;
				if (!task.assigned_user) return false;

				// Ensure assigned_user is an array
				const assignedUsers = Array.isArray(task.assigned_user)
					? task.assigned_user
					: [task.assigned_user];

				return assignedUsers.some((u) => {
					if (u === undefined || u === null) return false;

					// Convert to string for comparison
					return u.toString() === user.id.toString();
				});
			});
			setTasksToMe(toMeTasks);

			// Filter out archived tasks (status COMPLETED)
			const activeToMe = toMeTasks.filter(
				(task) => task.status !== TaskStatusBackend.COMPLETED
			);
			setActiveTasksToMe(activeToMe);

			// Filter tasks created by the user
			const byMeTasks = spaceTasks.filter((task) => {
				if (!task) return false;
				if (!user?.id) return false;
				if (!task.created_by) return false;

				const createdBy = task.created_by;

				// If created_by is a string (user ID)
				if (typeof createdBy === "string") {
					return createdBy === user.id.toString();
				}

				// If created_by is a User object with id
				if (typeof createdBy === "object") {
					// Handle standard User object
					const creatorId = createdBy.id;
					if (creatorId) {
						return creatorId.toString() === user.id.toString();
					}

					// Handle non-standard object formats
					const anyCreator = createdBy as any;
					if (anyCreator.user_id || anyCreator.userId) {
						const altId = anyCreator.user_id || anyCreator.userId;
						return altId.toString() === user.id.toString();
					}
				}

				return false;
			});
			setTasksByMe(byMeTasks);

			// Filter out archived tasks (status COMPLETED)
			const activeByMe = byMeTasks.filter(
				(task) => task.status !== TaskStatusBackend.COMPLETED
			);
			setActiveTasksByMe(activeByMe);

			setError(null);
		} catch (err) {
			console.error("Error fetching tasks:", err);
			setError(
				t("tasks.loadError") || "Failed to load tasks. Please try again later."
			);
		} finally {
			setLoading(false);
		}
	};

	// This effect ensures tasks are loaded when the component mounts, regardless of selectedSpace
	useEffect(() => {
		if (!allTasks.length) {
			refreshTasks().then(() => {
				fetchTasks();
			});
		}
	}, []); // Empty dependency array ensures this runs once on mount

	useEffect(() => {
		// Fetch tasks whenever selectedSpace or allTasks change
		fetchTasks();

		// Check if we're on mobile
		const checkIfMobile = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
		};

		// Initial check
		checkIfMobile();

		// Add event listener for window resize
		window.addEventListener("resize", checkIfMobile);

		// Clean up event listener
		return () => window.removeEventListener("resize", checkIfMobile);
	}, [selectedSpace?.id, user?.id, allTasks.length]); // Depend on allTasks.length to ensure we refetch when tasks are updated

	// Handle edit task from URL parameter
	useEffect(() => {
		// If we have an edit task ID in the URL, find and edit that task
		if (editTaskId) {
			const findAndEditTask = async () => {
				try {
					// Get the task details
					const taskResponse = await ApiService.getTask(editTaskId);
					const task = taskResponse.data;

					if (task) {
						// Check if the current user is the creator of the task
						const isTaskCreatedByMe =
							typeof task.created_by === "string"
								? task.created_by === "1"
								: task.created_by.id.toString() === "1";

						if (isTaskCreatedByMe) {
							// Set up the form for editing
							setSelectedTask(task);
							setFormData({
								name: task.name,
								description: task.description || "",
								status: task.status,
								is_checked: task.is_checked || false,
								priority: task.priority,
								team: task.team || null,
								// Convert assigned_user to the correct format
								assigned_user: Array.isArray(task.assigned_user)
									? task.assigned_user.map((id: any) => String(id))
									: task.assigned_user
									? [String(task.assigned_user)]
									: [],
								deadline: task.deadline,
							});

							// Open the appropriate dialog based on device
							if (isMobile) {
								setIsDrawerOpen(true);
							} else {
								setIsDialogOpen(true);
							}
						} else {
							// If not created by the user, just redirect back to tasks
							alert(
								t("tasks.onlyStatusChangesAllowed") ||
									"You can only change the status of tasks assigned to you"
							);
						}

						// Clear the edit parameter from the URL
						router.replace("/tasks");
					}
				} catch (error) {
					console.error("Error fetching task for editing:", error);
				}
			};

			findAndEditTask();
		}
	}, [editTaskId, isMobile, router, t]);

	// Load teams and users
	useEffect(() => {
		const fetchTeamsAndUsers = async () => {
			if (!isDrawerOpen && !isDialogOpen) return;

			try {
				setLoadingUsers(true);

				// We already have teams from CoreContext, no need to fetch again
				// Just use the teams from CoreContext

				// Fetch users if needed (we might already have them from CoreContext)
				if (coreUsers.length === 0) {
					const usersResponse = await ApiService.getUsers(undefined, true);
					if (Array.isArray(usersResponse)) {
						setUsers(usersResponse);
					} else {
						setUsers(usersResponse.data.results || []);
					}
				} else {
					// Use users from CoreContext
					setUsers(coreUsers);
				}
			} catch (err) {
				console.error("Error fetching users:", err);
			} finally {
				setLoadingUsers(false);
			}
		};

		fetchTeamsAndUsers();
	}, [isDrawerOpen, isDialogOpen, coreUsers]);

	// Update available users when team is selected
	useEffect(() => {
		if (formData.team !== null) {
			const team = teams.find((t) => t.id === formData.team);
			setSelectedTeam(team || null);

			// Clear selected users if they're not in the team
			if (team) {
				setFormData((prev) => ({
					...prev,
					assigned_user: Array.isArray(prev.assigned_user)
						? prev.assigned_user.filter((userId: string) =>
								team.members.some((member) => member.id.toString() === userId)
						  )
						: [],
				}));
			}
		} else {
			setSelectedTeam(null);
		}
	}, [formData.team, teams]);

	// Handle opening task form for creating a new task
	const handleAddTask = () => {
		setSelectedTask(null);
		setFormData({
			name: "",
			description: "",
			status: TaskStatusBackend.ASSIGNED,
			is_checked: false,
			priority: TaskPriorityBackend.MEDIUM,
			team: null,
			assigned_user: [], // empty array for new tasks
			deadline: "",
		});

		// Open drawer on mobile, dialog on desktop
		if (isMobile) {
			setIsDrawerOpen(true);
		} else {
			setIsDialogOpen(true);
		}
	};

	// Handle opening task form for editing an existing task
	const handleEditTask = (task: BackendTask) => {
		// For tasks assigned to me but not created by me, only allow status changes
		const isTaskCreatedByMe =
			typeof task.created_by === "string"
				? task.created_by === "1"
				: task.created_by.id.toString() === "1";

		// If the task is not created by me and we're in the "To Me" tab,
		// redirect to the task's detail page instead of opening the edit form
		if (!isTaskCreatedByMe && activeTab === "to-me") {
			// Redirect to task detail page
			router.push(`/tasks/${task.id}`);
			return;
		}

		setSelectedTask(task);
		setFormData({
			name: task.name,
			description: task.description,
			status: task.status,
			is_checked: task.is_checked || false,
			priority: task.priority,
			team: task.team,
			// Convert assigned_user to the correct format
			assigned_user: Array.isArray(task.assigned_user)
				? task.assigned_user.map((id) => String(id))
				: task.assigned_user
				? [String(task.assigned_user)]
				: [],
			deadline: task.deadline || "",
		});

		// Open drawer on mobile, dialog on desktop
		if (isMobile) {
			setIsDrawerOpen(true);
		} else {
			setIsDialogOpen(true);
		}
	};

	// Handle form input changes
	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim()) {
			// Show validation error
			toast.error(t("tasks.nameRequired") || "Task name is required");
			return;
		}

		try {
			setSavingTask(true);

			// Format task data for API
			const taskData = {
				name: formData.name.trim(),
				description: formData.description.trim(),
				status: TaskStatusBackend.ASSIGNED, // New tasks always start as assigned
				is_checked: false,
				priority: Number(formData.priority),
				team: formData.team ? Number(formData.team) : null,
				deadline: formData.deadline || null,
			};

			// Prepare payload for API
			let apiTaskData;

			if (selectedTask) {
				// For updates, keep the existing format with assigned_user
				apiTaskData = {
					...taskData,
					// Backend expects an array of user IDs under `assigned_user` for updates
					assigned_user:
						formData.assigned_user &&
						Array.isArray(formData.assigned_user) &&
						formData.assigned_user.length > 0
							? formData.assigned_user.map((id) => Number(id))
							: formData.assigned_user
							? [Number(formData.assigned_user)]
							: [],
				};

				// Update existing task using CoreContext
				await coreUpdateTask(
					selectedTask.id,
					apiTaskData as any // Use type assertion as a workaround
				);
				toast.success(t("tasks.updateSuccess") || "Task updated successfully");
			} else {
				// For new tasks, use the bulk endpoint with assigned_user array
				apiTaskData = {
					...taskData,
					// Pass assigned_user directly to let CoreProvider handle the extraction
					assigned_user: formData.assigned_user || [],
				};

				// Create new task(s) using CoreContext with the bulk endpoint
				await coreAddTask(apiTaskData as any);
				toast.success(t("tasks.createSuccess") || "Task created successfully");
			}

			handleTaskSaved();
		} catch (err) {
			console.error("Error saving task:", err);
			toast.error(t("tasks.saveError") || "Failed to save task");
		} finally {
			setSavingTask(false);
		}
	};

	// Close task form (either drawer or dialog)
	const closeTaskForm = () => {
		setIsDrawerOpen(false);
		setIsDialogOpen(false);
	};

	// Handle task save/update
	const handleTaskSaved = () => {
		closeTaskForm();
		fetchTasks();
	};

	// Handle task deletion
	const handleDeleteTask = (task: BackendTask, event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation(); // Prevent opening the edit form when clicking delete
		}
		setTaskToDelete(task);
		setIsDeleteDialogOpen(true);
	};

	// Confirm and execute task deletion
	const confirmDeleteTask = async () => {
		if (!taskToDelete) return;

		try {
			setIsDeleting(true);

			// Use CoreContext to delete the task
			const success = await coreDeleteTask(taskToDelete.id);

			if (success) {
				// Update UI after successful deletion
				// Update the appropriate task list based on who created the task
				// Determine if current user is creator of the task
				const isTaskByMe = (() => {
					if (!user?.id || !taskToDelete.created_by) return false;
					const createdBy = taskToDelete.created_by;
					if (typeof createdBy === "string") {
						return createdBy === user.id.toString();
					}
					if (typeof createdBy === "object") {
						const creatorId =
							(createdBy as any).id ||
							(createdBy as any).user_id ||
							(createdBy as any).userId;
						return creatorId?.toString() === user.id.toString();
					}
					return false;
				})();

				// Also check if the task was assigned to the current user
				const isTaskToMe = user?.id
					? taskToDelete.assigned_user?.toString?.() === user.id.toString() ||
					  (Array.isArray(taskToDelete.assigned_user) &&
							taskToDelete.assigned_user.some(
								(id) =>
									id !== null &&
									id !== undefined &&
									id.toString() === user.id.toString()
							))
					: false;

				// Update active task lists based on the new status
				if (isTaskByMe) {
					setTasksByMe((prevTasks) =>
						prevTasks.filter((task) => task.id !== taskToDelete.id)
					);
				}

				// Also update tasksToMe if the task was assigned to the current user
				if (isTaskToMe) {
					setTasksToMe((prevTasks) =>
						prevTasks.filter((task) => task.id !== taskToDelete.id)
					);
				}

				toast.success(t("tasks.deleteSuccess") || "Task deleted successfully");
				setIsDeleteDialogOpen(false);
			} else {
				toast.error(t("tasks.deleteError") || "Failed to delete task");
			}
		} catch (err) {
			console.error("Error deleting task:", err);
			toast.error(t("tasks.deleteError") || "Failed to delete task");
		} finally {
			setIsDeleting(false);
		}
	};

	// Handle drag start
	const handleDragStart = (task: BackendTask) => {
		setDraggedTask(task);
	};

	// Handle drag over
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	// Handle drop
	const handleDrop = async (status: number) => {
		if (!draggedTask || draggedTask.status === status) return;

		try {
			// Check if the task is being moved to COMPLETED status (archived) or from COMPLETED to another status (unarchived)
			const isArchiving = status === TaskStatusBackend.COMPLETED;
			const isUnarchiving =
				draggedTask.status === TaskStatusBackend.COMPLETED &&
				status !== TaskStatusBackend.COMPLETED;

			// Update task status in UI first for immediate feedback
			// Update the appropriate task list based on who created the task
			const isTaskByMe =
				typeof draggedTask.created_by === "string"
					? draggedTask.created_by === user?.id?.toString()
					: draggedTask.created_by?.id?.toString() === user?.id?.toString();

			// Also check if the task was assigned to the current user
			const isTaskToMe =
				draggedTask.assigned_user?.toString?.() === user?.id?.toString() ||
				draggedTask.assigned_user?.some((id) => {
					return id?.toString() === user?.id?.toString();
				});

			// Update active task lists based on the new status
			if (isArchiving) {
				// Moving to archived (COMPLETED) - remove from active lists
				if (isTaskByMe) {
					setActiveTasksByMe((prev: BackendTask[]) =>
						prev.filter((t) => t.id !== draggedTask.id)
					);
				}
				if (isTaskToMe) {
					setActiveTasksToMe((prev: BackendTask[]) =>
						prev.filter((t) => t.id !== draggedTask.id)
					);
				}

				// Task is now archived, we'll need to refresh the archived tasks page when the user navigates there
			} else if (isUnarchiving) {
				// Moving from archived to active - add to active lists
				if (isTaskByMe) {
					setActiveTasksByMe((prev: BackendTask[]) => [
						...prev,
						{ ...draggedTask, status },
					]);
				}
				if (isTaskToMe) {
					setActiveTasksToMe((prev: BackendTask[]) => [
						...prev,
						{ ...draggedTask, status },
					]);
				}
			} else {
				// Just updating status within active tasks
				if (isTaskByMe) {
					setActiveTasksByMe((prev) =>
						prev.map((task) =>
							task.id === draggedTask.id ? { ...task, status } : task
						)
					);
				}
				if (isTaskToMe) {
					setActiveTasksToMe((prev) =>
						prev.map((task) =>
							task.id === draggedTask.id ? { ...task, status } : task
						)
					);
				}
			}

			// Update task status in API using CoreContext
			await coreUpdateTask(draggedTask.id, {
				status,
			} as any);

			// Refetch tasks to ensure we have the latest data
			fetchTasks();
		} catch (err) {
			console.error("Error updating task status:", err);
			// Revert UI change on error
			fetchTasks();
		} finally {
			setDraggedTask(null);
		}
	};

	// Get active tab from URL or default to "to-me"
	const tabParam = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(
		tabParam === "by-me" ? "by-me" : "to-me"
	);

	// We now get tasks from separate API endpoints, so no need to filter

	// Handle archiving a task
	const handleArchiveTask = async (
		task: BackendTask,
		event?: React.MouseEvent
	) => {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		try {
			// Set task status to COMPLETED to mark it as archived
			const updatedTask = await coreUpdateTask(task.id, {
				status: TaskStatusBackend.COMPLETED,
			} as any);

			// Update the local state to move the task from active to archived lists
			const isTaskByMe =
				typeof task.created_by === "string"
					? task.created_by === user?.id?.toString()
					: task.created_by?.id?.toString() === user?.id?.toString();

			const isTaskToMe =
				task.assigned_user?.toString?.() === user?.id?.toString() ||
				task.assigned_user?.some((id) => {
					return id?.toString() === user?.id?.toString();
				});

			// Update active task lists by removing the archived task
			if (isTaskByMe) {
				setActiveTasksByMe((prev: BackendTask[]) =>
					prev.filter((t) => t.id !== task.id)
				);
			}

			if (isTaskToMe) {
				setActiveTasksToMe((prev: BackendTask[]) =>
					prev.filter((t) => t.id !== task.id)
				);
			}

			// Show success message
			toast.success(t("tasks.archivedSuccess") || "Task archived successfully");
		} catch (error) {
			console.error("Error archiving task:", error);
			toast.error(t("tasks.archiveError") || "Failed to archive task");
		}
	};

	// Handle priority change for mobile devices
	const handlePriorityChange = async (
		task: BackendTask,
		newPriority: number
	) => {
		try {
			// Update UI first for immediate feedback
			const isArchived = task.status === TaskStatusBackend.COMPLETED;

			// Only update active tasks in the main tasks page
			// Archived tasks are handled in the archived tasks page
			if (!isArchived) {
				if (activeTab === "by-me") {
					setActiveTasksByMe((prevTasks: BackendTask[]) =>
						prevTasks.map((t) =>
							t.id === task.id ? { ...t, priority: newPriority } : t
						)
					);
				} else if (activeTab === "to-me") {
					setActiveTasksToMe((prevTasks: BackendTask[]) =>
						prevTasks.map((t) =>
							t.id === task.id ? { ...t, priority: newPriority } : t
						)
					);
				}
			}

			// Update task priority using CoreContext
			await coreUpdateTask(Number(task.id), {
				priority: newPriority,
			} as any);
		} catch (error) {
			console.error("Error updating task priority:", error);
			// Revert UI changes if API call fails
			fetchTasks();
		}
	};

	return (
		<div className="container py-6 space-y-6">
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink className="flex items-center gap-1" href="/">
							<Home className="h-4 w-4 mr-1" />
							{t("common.home") || "Home"}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>
							<ClipboardList className="h-4 w-4 mr-1 inline" />
							{t("tasks.title") || "Tasks"}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl font-bold">{tasksTitle}</h1>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/tasks/archived")}
					>
						<Archive className="mr-2 h-4 w-4" />
						Archived Tasks
					</Button>
					<Button onClick={handleAddTask}>
						<Plus className="mr-2 h-4 w-4" />
						{addTaskLabel}
					</Button>
				</div>
			</div>

			<Tabs
				defaultValue={activeTab}
				onValueChange={(value) => {
					setActiveTab(value);
					// Update URL when tab changes without full page reload
					router.push(`/tasks?tab=${value}`, { scroll: false });
				}}
			>
				<TabsList className="mb-4">
					<TabsTrigger value="to-me">To Me</TabsTrigger>
					<TabsTrigger value="by-me">By Me</TabsTrigger>
				</TabsList>

				<TabsContent value="to-me" className="mt-0">
					<TaskSection
						tasks={activeTasksToMe}
						loading={loading}
						error={error}
						onAddTask={handleAddTask}
						onEditTask={handleEditTask}
						onDeleteTask={handleDeleteTask}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						isTasksCreatedByMe={false} // These tasks are assigned to me, not created by me
						onPriorityChange={handlePriorityChange}
						title={t("tasks.assignedToMe") || "Tasks Assigned to Me"}
					/>
				</TabsContent>

				<TabsContent value="by-me" className="mt-0">
					<TaskSection
						tasks={activeTasksByMe}
						loading={loading}
						error={error}
						onAddTask={handleAddTask}
						onEditTask={handleEditTask}
						onDeleteTask={handleDeleteTask}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						isTasksCreatedByMe={true} // These tasks are created by me
						onPriorityChange={handlePriorityChange}
						onArchiveTask={handleArchiveTask}
						title={t("tasks.createdByMe") || "Tasks Created by Me"}
					/>
				</TabsContent>
			</Tabs>

			{/* Task Drawer (Mobile) */}
			<TaskDrawer
				isOpen={isDrawerOpen}
				setIsOpen={setIsDrawerOpen}
				formData={formData}
				setFormData={setFormData}
				handleChange={handleChange}
				handleSubmit={handleSubmit}
				selectedTask={selectedTask}
				teams={teams}
				users={users}
				loadingTeams={loadingTeams}
				loadingUsers={loadingUsers}
				teamSearch={teamSearch}
				userSearch={userSearch}
				setTeamSearch={setTeamSearch}
				setUserSearch={setUserSearch}
				selectedTeam={selectedTeam}
				savingTask={savingTask}
			/>

			{/* Task Dialog (Desktop) */}
			<TaskDialog
				isOpen={isDialogOpen}
				setIsOpen={setIsDialogOpen}
				formData={formData}
				setFormData={setFormData}
				handleChange={handleChange}
				handleSubmit={handleSubmit}
				selectedTask={selectedTask}
				teams={teams}
				users={users}
				loadingTeams={loadingTeams}
				loadingUsers={loadingUsers}
				teamSearch={teamSearch}
				userSearch={userSearch}
				setTeamSearch={setTeamSearch}
				setUserSearch={setUserSearch}
				selectedTeam={selectedTeam}
				savingTask={savingTask}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("tasks.deleteConfirmTitle") === "tasks.deleteConfirmTitle"
								? "Delete Task"
								: t("tasks.deleteConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("tasks.deleteConfirmMessage") === "tasks.deleteConfirmMessage"
								? "Are you sure you want to delete this task? This action cannot be undone."
								: t("tasks.deleteConfirmMessage")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							{t("common.cancel") === "common.cancel"
								? "Cancel"
								: t("common.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteTask}
							disabled={isDeleting}
						>
							{isDeleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("tasks.deleting") === "tasks.deleting"
										? "Deleting..."
										: t("tasks.deleting")}
								</>
							) : t("tasks.confirmDelete") === "tasks.confirmDelete" ? (
								"Delete"
							) : (
								t("tasks.confirmDelete")
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
