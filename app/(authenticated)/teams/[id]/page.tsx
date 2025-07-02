"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
	ChevronLeft,
	Edit,
	Plus,
	Trash2,
	Users,
	UserPlus,
	X,
	ClipboardList,
	Home,
	Loader2,
	Save,
	Search,
	Check,
	User,
	ExternalLink,
	ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import ApiService from "@/lib/api";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/lib/auth";
import { TaskSection } from "@/components/tasks/TaskSection";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
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
import {
	Task as BackendTask,
	TaskStatusBackend,
	TaskPriorityBackend,
} from "@/lib/types";

// Custom form data interface to avoid conflict with browser's FormData
interface TaskFormData {
	name: string;
	description: string;
	status: number;
	is_checked: boolean;
	priority: number;
	team: string | number | null;
	assigned_user: string[] | string | null;
	deadline: string;
}

// Team interface
interface TeamMember {
	id: string;
	username: string;
	first_name: string;
	last_name: string;
	position: {
		id: number;
		name: string;
	};
	region: {
		id: number;
		name: string;
	};
	district?: {
		id: number;
		name: string;
		region: number;
	};
	date_joined: string;
}

interface Team {
	id: number;
	created_at: string;
	updated_at: string;
	name: string;
	description: string;
	owner: TeamMember;
	admins: TeamMember[];
	members: TeamMember[];
}

export default function TeamDetailPage() {
	const { id } = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { t } = useLanguage();
	const { user } = useAuth();
	const [team, setTeam] = useState<Team | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<string>("members");

	// Task-related states
	const [teamTasks, setTeamTasks] = useState<BackendTask[]>([]);
	const [loadingTasks, setLoadingTasks] = useState(true);
	const [taskError, setTaskError] = useState<string | null>(null);
	const [draggedTask, setDraggedTask] = useState<BackendTask | null>(null);
	const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [users, setUsers] = useState<TeamMember[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [userSearch, setUserSearch] = useState("");
	const [teamSearch, setTeamSearch] = useState("");
	const [savingTask, setSavingTask] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<BackendTask | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Team edit related states
	const [isEditTeamDialogOpen, setIsEditTeamDialogOpen] = useState(false);
	const [teamFormData, setTeamFormData] = useState({
		name: "",
		description: "",
	});
	const [savingTeam, setSavingTeam] = useState(false);

	// Add member/admin related states
	const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
	const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
	const [availableUsers, setAvailableUsers] = useState<any[]>([]);
	const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
	const [userSearchQuery, setUserSearchQuery] = useState("");
	const [addingUser, setAddingUser] = useState(false);
	const [removingUser, setRemovingUser] = useState(false);
	const [userToRemove, setUserToRemove] = useState<string | null>(null);
	const [isRemoveUserDialogOpen, setIsRemoveUserDialogOpen] = useState(false);
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
		null
	);

	// Check if we have an edit parameter in the URL
	const editTaskId = searchParams.get("edit");

	// Using the TaskFormData interface defined above

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

	// Fetch available users that can be added to the team
	const fetchAvailableUsers = async (search = "") => {
		if (!team) return;

		try {
			setLoadingAvailableUsers(true);
			const response = await ApiService.getUsers(search);

			// Filter out users that are already in the team
			let users;
			if (Array.isArray(response)) {
				users = response;
			} else {
				users = response.data.results;
			}

			// Get existing team member IDs
			const existingMemberIds = new Set([
				team.owner.id,
				...team.admins.map((admin) => admin.id),
				...team.members.map((member) => member.id),
			]);

			// Filter out users already in the team
			const filteredUsers = users.filter(
				(user) => !existingMemberIds.has(user.id)
			);

			setAvailableUsers(filteredUsers);
		} catch (error) {
			console.error("Error fetching available users:", error);
		} finally {
			setLoadingAvailableUsers(false);
		}
	};

	// Toggle user selection for multi-select
	const toggleUserSelection = (userId: string) => {
		setSelectedUserIds((prev) => {
			if (prev.includes(userId)) {
				return prev.filter((id) => id !== userId);
			} else {
				return [...prev, userId];
			}
		});
	};

	// Check if current user is admin or owner
	const isAdminOrOwner = () => {
		if (!team || !user) return false;

		// Check if user is the owner
		if (team.owner.id === user.id) return true;

		// Check if user is an admin
		return team.admins.some((admin) => admin.id === user.id);
	};

	// Fetch team data
	useEffect(() => {
		const fetchTeam = async () => {
			try {
				setLoading(true);
				const response = await ApiService.getTeam(id as string);
				setTeam(response.data);
				setTeamFormData({
					name: response.data.name || "",
					description: response.data.description || "",
				});
				setError(null);
			} catch (err) {
				console.error("Error fetching team:", err);
				setError("Failed to load team details. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		if (id) {
			fetchTeam();
		}
	}, [id]);

	// Fetch team tasks
	useEffect(() => {
		const fetchTeamTasks = async () => {
			if (!id) return;

			try {
				setLoadingTasks(true);
				// Use the generic request method to get team tasks
				const response = await ApiService.request<
					{ results?: BackendTask[]; data?: BackendTask[] } | BackendTask[]
				>({
					method: "get",
					url: `/api/core/teams/${id}/tasks/`,
				});
				if (Array.isArray(response.data)) {
					setTeamTasks(response.data);
				} else {
					const data = response.data as any;
					setTeamTasks(data.results || data);
				}
				setTaskError(null);
			} catch (err) {
				console.error("Error fetching team tasks:", err);
				setTaskError("Failed to load team tasks. Please try again.");
			} finally {
				setLoadingTasks(false);
			}
		};

		fetchTeamTasks();
	}, [id]);

	// Check if we're on mobile
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);
		return () => window.removeEventListener("resize", checkIfMobile);
	}, []);

	// Find and edit task if edit parameter is present
	useEffect(() => {
		const findAndEditTask = async () => {
			if (!editTaskId || !id) return;

			try {
				setLoadingTasks(true);
				const response = await ApiService.getTask(editTaskId);
				const taskToEdit = response.data;

				if (taskToEdit) {
					setSelectedTask(taskToEdit);
					setFormData({
						name: taskToEdit.name || "",
						description: taskToEdit.description || "",
						status: taskToEdit.status || TaskStatusBackend.ASSIGNED,
						is_checked: taskToEdit.is_checked || false,
						priority: taskToEdit.priority || TaskPriorityBackend.MEDIUM,
						team: taskToEdit.team?.id || taskToEdit.team || null,
						assigned_user:
							taskToEdit.assigned_user?.map((user: any) =>
								typeof user === "object" ? user.id : user
							) || [],
						deadline: taskToEdit.deadline || "",
					});

					if (isMobile) {
						setIsDrawerOpen(true);
					} else {
						setIsDialogOpen(true);
					}
				}
			} catch (err) {
				console.error("Error fetching task to edit:", err);
			} finally {
				setLoadingTasks(false);
			}
		};

		findAndEditTask();
	}, [editTaskId, id, isMobile]);

	// Prepare users for task assignment
	useEffect(() => {
		const prepareUsers = () => {
			if (!team) return;

			const allUsers = [team.owner, ...team.admins, ...team.members].filter(
				Boolean
			);

			// Remove duplicates by id
			const uniqueUsers = allUsers.filter(
				(user, index, self) => index === self.findIndex((u) => u.id === user.id)
			);

			setUsers(uniqueUsers);
		};

		prepareUsers();
	}, [team]);

	// Format date to a more readable format
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Get user initials for avatar
	const getUserInitials = (firstName?: string, lastName?: string): string => {
		const firstInitial =
			firstName && firstName.length > 0 ? firstName.charAt(0) : "";
		const lastInitial =
			lastName && lastName.length > 0 ? lastName.charAt(0) : "";

		if (!firstInitial && !lastInitial) {
			return "U"; // Default for unknown user
		}

		return `${firstInitial}${lastInitial}`.toUpperCase();
	};

	// Task handlers
	const handleAddTask = () => {
		// Reset form data
		setFormData({
			name: "",
			description: "",
			status: TaskStatusBackend.ASSIGNED,
			is_checked: false,
			priority: TaskPriorityBackend.MEDIUM,
			team: team?.id || null,
			assigned_user: [],
			deadline: "",
		});

		setSelectedTask(null);

		if (isMobile) {
			setIsDrawerOpen(true);
		} else {
			setIsDialogOpen(true);
		}
	};

	const handleEditTask = (task: BackendTask) => {
		setSelectedTask(task);

		setFormData({
			name: task.name || "",
			description: task.description || "",
			status: task.status || TaskStatusBackend.ASSIGNED,
			is_checked: task.is_checked || false,
			priority: task.priority || TaskPriorityBackend.MEDIUM,
			team:
				(typeof task.team === "object" && task.team !== null
					? (task.team as any).id
					: task.team) ||
				team?.id ||
				null,
			assigned_user:
				task.assigned_user?.map((user: any) =>
					typeof user === "object" ? user.id : user
				) || [],
			deadline: task.deadline || "",
		});

		if (isMobile) {
			setIsDrawerOpen(true);
		} else {
			setIsDialogOpen(true);
		}
	};

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value, type } = e.target;
		setFormData({
			...formData,
			[name]:
				type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSavingTask(true);

		try {
			const taskData = {
				...formData,
				team: team?.id,
			};

			if (selectedTask) {
				// Update existing task
				await ApiService.updateTask(String(selectedTask.id), taskData);
			} else {
				// Create new task
				await ApiService.createTask(taskData);
			}

			// Refresh tasks
			const response = await ApiService.request<
				{ results?: BackendTask[]; data?: BackendTask[] } | BackendTask[]
			>({
				method: "get",
				url: `/api/core/teams/${id}/tasks/`,
			});
			const data = response.data as any;
			setTeamTasks(data.results || data);

			// Close form
			closeTaskForm();
		} catch (error) {
			console.error("Error saving task:", error);
		} finally {
			setSavingTask(false);
		}
	};

	const closeTaskForm = () => {
		setIsDialogOpen(false);
		setIsDrawerOpen(false);
	};

	const handleDeleteTask = (task: BackendTask, event?: React.MouseEvent) => {
		if (event) event.stopPropagation();
		setTaskToDelete(task);
		setIsDeleteDialogOpen(true);
	};

	const confirmDeleteTask = async () => {
		if (!taskToDelete) return;

		setIsDeleting(true);

		try {
			await ApiService.deleteTask(String(taskToDelete.id));

			// Remove the deleted task from the state
			setTeamTasks(teamTasks.filter((task) => task.id !== taskToDelete.id));

			// Close the dialog
			setIsDeleteDialogOpen(false);
			setTaskToDelete(null);
		} catch (error) {
			console.error("Error deleting task:", error);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDragStart = (task: BackendTask) => {
		setDraggedTask(task);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = async (status: number) => {
		if (!draggedTask || draggedTask.status === status) return;

		// Create a copy of the dragged task with the new status
		const updatedTask = { ...draggedTask, status };

		try {
			// Update the task in the backend
			await ApiService.updateTask(String(draggedTask.id), { status });

			// Update the task in the local state
			setTeamTasks((prevTasks) =>
				prevTasks.map((task) =>
					task.id === draggedTask.id ? { ...task, status } : task
				)
			);
		} catch (error) {
			console.error("Error updating task status:", error);
		} finally {
			setDraggedTask(null);
		}
	};

	// Handle opening add member dialog
	const handleOpenAddMemberDialog = () => {
		setSelectedUserIds([]);
		setUserSearchQuery("");
		fetchAvailableUsers();
		setIsAddMemberDialogOpen(true);
	};

	// Handle opening add admin dialog
	const handleOpenAddAdminDialog = () => {
		setSelectedUserIds([]);
		setUserSearchQuery("");
		fetchAvailableUsers();
		setIsAddAdminDialogOpen(true);
	};

	// Handle user search with debounce
	const handleUserSearch = (value: string) => {
		setUserSearchQuery(value);

		// Clear any existing timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Set a new timeout to debounce the search
		const timeout = setTimeout(() => {
			fetchAvailableUsers(value);
		}, 300); // 300ms debounce

		setSearchTimeout(timeout);
	};

	// Handle adding members to the team
	const handleAddMembers = async () => {
		if (!team || selectedUserIds.length === 0) return;

		try {
			setAddingUser(true);
			await ApiService.addTeamMember(String(team.id), selectedUserIds);

			// Refresh team data to get updated members list
			const response = await ApiService.getTeam(id as string);
			setTeam(response.data);

			setIsAddMemberDialogOpen(false);
			setSelectedUserIds([]);
		} catch (error) {
			console.error("Error adding team members:", error);
		} finally {
			setAddingUser(false);
		}
	};

	// Handle opening remove user dialog
	const handleOpenRemoveUserDialog = (userId: string) => {
		setUserToRemove(userId);
		setIsRemoveUserDialogOpen(true);
	};

	// Handle removing a user (member or admin) from the team
	const handleRemoveMember = async () => {
		if (!team || !userToRemove) return;

		try {
			setRemovingUser(true);

			// Check if the user is an admin
			const isAdmin = team.admins.some((admin) => admin.id === userToRemove);

			if (isAdmin) {
				// Remove admin
				await ApiService.removeTeamAdmins(String(team.id), [userToRemove]);
			} else {
				// Remove regular member
				await ApiService.removeTeamMember(String(team.id), userToRemove);
			}

			// Refresh team data to get updated members list
			const response = await ApiService.getTeam(id as string);
			setTeam(response.data);

			setIsRemoveUserDialogOpen(false);
			setUserToRemove(null);
		} catch (error) {
			console.error("Error removing team user:", error);
		} finally {
			setRemovingUser(false);
		}
	};

	// Handle adding admins to the team
	const handleAddAdmins = async () => {
		if (!team || selectedUserIds.length === 0) return;

		try {
			setAddingUser(true);
			await ApiService.addTeamAdmin(String(team.id), selectedUserIds);

			// Refresh team data to get updated admins list
			const response = await ApiService.getTeam(id as string);
			setTeam(response.data);

			setIsAddAdminDialogOpen(false);
			setSelectedUserIds([]);
		} catch (error) {
			console.error("Error adding team admins:", error);
		} finally {
			setAddingUser(false);
		}
	};

	// Team edit handlers
	const handleEditTeam = () => {
		if (!team) return;

		setTeamFormData({
			name: team.name,
			description: team.description || "",
		});

		setIsEditTeamDialogOpen(true);
	};

	const handleTeamFormChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setTeamFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleTeamSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!team || !teamFormData.name.trim()) return;

		try {
			setSavingTeam(true);

			await ApiService.updateTeam(String(team.id), {
				name: teamFormData.name.trim(),
				description: teamFormData.description.trim(),
			});

			// Update local state
			setTeam((prev) => {
				if (!prev) return null;
				return {
					...prev,
					name: teamFormData.name.trim(),
					description: teamFormData.description.trim(),
				};
			});

			setIsEditTeamDialogOpen(false);
		} catch (error) {
			console.error("Error updating team:", error);
		} finally {
			setSavingTeam(false);
		}
	};

	const handlePriorityChange = async (
		task: BackendTask,
		newPriority: number
	) => {
		if (task.priority === newPriority) return;

		try {
			// Update the task in the backend
			await ApiService.updateTask(String(task.id), { priority: newPriority });

			// Update the task in the local state
			setTeamTasks((prevTasks) =>
				prevTasks.map((t) =>
					t.id === task.id ? { ...t, priority: newPriority } : t
				)
			);
		} catch (error) {
			console.error("Error updating task priority:", error);
		}
	};

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6">
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
							<BreadcrumbLink className="flex items-center gap-1" href="/teams">
								{t("teams.teams") || "Teams"}
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>
								{loading ? "Loading..." : team?.name}
							</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold">
						{loading ? "Loading..." : team?.name}
					</h1>
					<Button asChild>
						<Link
							href={`/teams/${id?.toString()}/tasks`}
							className="flex items-center gap-2"
						>
							<ClipboardList className="h-4 w-4" />
							{t("teams.tasks") || "Tasks"}
						</Link>
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="flex justify-center my-12">
					<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
				</div>
			) : error ? (
				<div className="bg-destructive/15 text-destructive p-4 rounded-md">
					{error}
				</div>
			) : team ? (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Team Info Card */}
					<div className="lg:col-span-1">
						<Card>
							<CardHeader>
								<div className="flex justify-between items-center">
									<CardTitle>{t("teams.teamInfo") || "Team Info"}</CardTitle>
									{isAdminOrOwner() && (
										<Button
											variant="outline"
											size="sm"
											onClick={handleEditTeam}
										>
											<Edit className="mr-2 h-4 w-4" />
											{t("teams.editTeam") || "Edit Team"}
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<h3 className="text-sm font-medium text-muted-foreground mb-1">
										{t("teams.description") || "Description"}
									</h3>
									<p className="text-sm">
										{team.description || t("teams.noDescription")}
									</p>
								</div>

								<Separator />

								<div>
									<h3 className="text-sm font-medium text-muted-foreground mb-1">
										{t("teams.owner") || "Owner"}
									</h3>
									<div className="flex items-center gap-2">
										<Avatar className="h-8 w-8">
											<AvatarFallback>
												{getUserInitials(
													team.owner.first_name,
													team.owner.last_name
												)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm font-medium">
												{team.owner.first_name} {team.owner.last_name}
											</p>
											<p className="text-xs text-muted-foreground">
												{team.owner.position?.name}
											</p>
										</div>
									</div>
								</div>

								<Separator />

								<div>
									<h3 className="text-sm font-medium text-muted-foreground mb-1">
										{t("teams.created") || "Created"}
									</h3>
									<p className="text-sm">{formatDate(team.created_at)}</p>
								</div>

								<Separator />

								<div className="flex justify-between">
									<div>
										<h3 className="text-sm font-medium text-muted-foreground mb-1">
											{t("teams.members") || "Members"}
										</h3>
										<p className="text-sm font-medium">
											{team.members.length + 1} {/* +1 for owner */}
										</p>
									</div>
									<div>
										<h3 className="text-sm font-medium text-muted-foreground mb-1">
											{t("teams.admins") || "Admins"}
										</h3>
										<p className="text-sm font-medium">
											{team.admins.length + 1} {/* +1 for owner */}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Team Members */}
					<div className="lg:col-span-2">
						<Tabs
							defaultValue="members"
							className="w-full"
							value={activeTab}
							onValueChange={setActiveTab}
						>
							<TabsList className="w-full mb-6">
								<TabsTrigger value="members" className="flex-1">
									<Users className="mr-2 h-4 w-4" />
									{t("teams.members") || "Members"}
								</TabsTrigger>
								<TabsTrigger value="admins" className="flex-1">
									<UserPlus className="mr-2 h-4 w-4" />
									{t("teams.admins") || "Admins"}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="members">
								<Card>
									<CardHeader>
										<div className="flex justify-between items-center">
											<CardTitle>
												{t("teams.teamMembers") || "Team Members"}
											</CardTitle>
											{isAdminOrOwner() && (
												<Button size="sm" onClick={handleOpenAddMemberDialog}>
													<UserPlus className="mr-2 h-4 w-4" />
													{t("teams.addMember") || "Add Member"}
												</Button>
											)}
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{/* Owner */}
											<div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
												<div className="flex items-center gap-3">
													<Avatar>
														<AvatarFallback>
															{getUserInitials(
																team.owner.first_name,
																team.owner.last_name
															)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-medium">
															{team.owner.first_name} {team.owner.last_name}
														</p>
														<p className="text-sm text-muted-foreground">
															{team.owner.position?.name}
														</p>
													</div>
												</div>
												<Badge variant="outline">
													{t("teams.owner") || "Owner"}
												</Badge>
											</div>

											{/* Members */}
											{team.members.map((member) => (
												<div
													key={member.id}
													className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-3">
														<Avatar>
															<AvatarFallback>
																{getUserInitials(
																	member.first_name,
																	member.last_name
																)}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-medium">
																{member.first_name} {member.last_name}
															</p>
															<p className="text-sm text-muted-foreground">
																{member.position?.name}
															</p>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge variant="outline" className="mr-2">
															{t("teams.member") || "Member"}
														</Badge>
														{isAdminOrOwner() && (
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
																onClick={() =>
																	handleOpenRemoveUserDialog(member.id)
																}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														)}
													</div>
												</div>
											))}

											{team.members.length === 0 && (
												<div className="text-center py-8 text-muted-foreground">
													{t("teams.noMembers") || "No members yet"}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value="admins">
								<Card>
									<CardHeader>
										<div className="flex justify-between items-center">
											<CardTitle>
												{t("teams.admins") || "Team Admins"}
											</CardTitle>
											{isAdminOrOwner() && (
												<Button size="sm" onClick={handleOpenAddAdminDialog}>
													<UserPlus className="mr-2 h-4 w-4" />
													{t("teams.addAdmin") || "Add Admin"}
												</Button>
											)}
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{/* Owner */}
											<div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
												<div className="flex items-center gap-3">
													<Avatar>
														<AvatarFallback>
															{getUserInitials(
																team.owner.first_name,
																team.owner.last_name
															)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="font-medium">
															{team.owner.first_name} {team.owner.last_name}
														</p>
														<p className="text-sm text-muted-foreground">
															{team.owner.position?.name}
														</p>
													</div>
												</div>
												<Badge variant="outline">
													{t("teams.owner") || "Owner"}
												</Badge>
											</div>

											{/* Admins */}
											{team.admins.map((admin) => (
												<div
													key={admin.id}
													className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-3">
														<Avatar>
															<AvatarFallback>
																{getUserInitials(
																	admin.first_name,
																	admin.last_name
																)}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className="font-medium">
																{admin.first_name} {admin.last_name}
															</p>
															<p className="text-sm text-muted-foreground">
																{admin.position?.name}
															</p>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge variant="outline" className="mr-2">
															{t("teams.admin") || "Admin"}
														</Badge>
														{isAdminOrOwner() && (
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
																onClick={() =>
																	handleOpenRemoveUserDialog(admin.id)
																}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														)}
													</div>
												</div>
											))}

											{team.admins.length === 0 && (
												<div className="text-center py-8 text-muted-foreground">
													{t("teams.noAdmins") || "No admins yet"}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			) : null}

			{/* Task Drawer (Mobile) */}
			<TaskDrawer
				isOpen={isDrawerOpen}
				setIsOpen={setIsDrawerOpen}
				formData={formData as any}
				setFormData={setFormData as any}
				handleChange={handleChange}
				handleSubmit={handleSubmit}
				selectedTask={selectedTask}
				teams={team ? [team] : []}
				users={users}
				loadingTeams={loading}
				loadingUsers={loadingUsers}
				teamSearch={teamSearch}
				userSearch={userSearch}
				setTeamSearch={setTeamSearch}
				setUserSearch={setUserSearch}
				selectedTeam={team}
				savingTask={savingTask}
			/>

			{/* Task Dialog (Desktop) */}
			<TaskDialog
				isOpen={isDialogOpen}
				setIsOpen={setIsDialogOpen}
				formData={formData as any}
				setFormData={setFormData as any}
				handleChange={handleChange}
				handleSubmit={handleSubmit}
				selectedTask={selectedTask}
				teams={team ? [team] : []}
				users={users}
				loadingTeams={loading}
				loadingUsers={loadingUsers}
				teamSearch={teamSearch}
				userSearch={userSearch}
				setTeamSearch={setTeamSearch}
				setUserSearch={setUserSearch}
				selectedTeam={team}
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

			{/* Team Edit Dialog */}
			<Dialog
				open={isEditTeamDialogOpen}
				onOpenChange={setIsEditTeamDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("teams.editTeam") || "Edit Team"}</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleTeamSubmit} className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">{t("teams.name") || "Name"}</Label>
							<Input
								id="name"
								name="name"
								value={teamFormData.name}
								onChange={handleTeamFormChange}
								placeholder={t("teams.enterTeamName") || "Enter team name"}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">
								{t("teams.description") || "Description"}
							</Label>
							<Textarea
								id="description"
								name="description"
								value={teamFormData.description}
								onChange={handleTeamFormChange}
								placeholder={
									t("teams.enterTeamDescription") || "Enter team description"
								}
								rows={4}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditTeamDialogOpen(false)}
								disabled={savingTeam}
							>
								{t("common.cancel") || "Cancel"}
							</Button>
							<Button type="submit" disabled={savingTeam}>
								{savingTeam ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										{t("common.saving") || "Saving..."}
									</>
								) : (
									<>
										<Save className="mr-2 h-4 w-4" />
										{t("common.save") || "Save"}
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Add Member Dialog */}
			<Dialog
				open={isAddMemberDialogOpen}
				onOpenChange={setIsAddMemberDialogOpen}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("teams.addMembers") || "Add Members"}</DialogTitle>
						<DialogDescription>
							{t("teams.addMembersDescription") ||
								"Select users to add as members to this team."}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col space-y-4 py-4">
						<div className="flex items-center px-3 py-2 rounded-md border">
							<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<input
								className="flex w-full bg-transparent outline-none placeholder:text-muted-foreground"
								placeholder={t("teams.searchUsers") || "Search users..."}
								value={userSearchQuery}
								onChange={(e) => handleUserSearch(e.target.value)}
							/>
							{userSearchQuery && (
								<Button
									variant="ghost"
									onClick={() => {
										setUserSearchQuery("");
										fetchAvailableUsers("");
									}}
									className="h-6 w-6 p-0 rounded-md"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>

						{selectedUserIds.length > 0 && (
							<div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
								<p className="w-full text-xs text-muted-foreground mb-1">
									{t("teams.selectedUsers", {
										count: selectedUserIds.length,
									}) || `${selectedUserIds.length} users selected`}
								</p>
								{selectedUserIds.map((id) => {
									const user = availableUsers.find((u) => u.id === id);
									if (!user) return null;
									return (
										<div
											key={id}
											className="flex items-center gap-1 text-xs bg-background rounded-full pl-2 pr-1 py-1"
										>
											<span>
												{user.first_name} {user.last_name}
											</span>
											<Button
												variant="ghost"
												onClick={() => toggleUserSelection(id)}
												className="h-4 w-4 p-0 rounded-full"
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									);
								})}
							</div>
						)}

						<div className="border rounded-md">
							{loadingAvailableUsers ? (
								<div className="flex items-center justify-center p-6">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : availableUsers.length === 0 ? (
								<p className="p-6 text-center text-sm text-muted-foreground">
									{t("teams.noUsersFound") || "No users found."}
								</p>
							) : (
								<ScrollArea className="h-72">
									<div className="p-1">
										{availableUsers.map((user) => (
											<div
												key={user.id}
												onClick={() => toggleUserSelection(user.id)}
												className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
													selectedUserIds.includes(user.id) ? "bg-muted" : ""
												}`}
											>
												<div className="flex items-center gap-2">
													<Avatar className="h-8 w-8">
														<AvatarFallback>
															{getUserInitials(user.first_name, user.last_name)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="text-sm font-medium">
															{user.first_name} {user.last_name}
														</p>
														<p className="text-xs text-muted-foreground">
															{user.username}
														</p>
													</div>
												</div>
												{selectedUserIds.includes(user.id) && (
													<Check className="h-4 w-4 text-primary" />
												)}
											</div>
										))}
									</div>
								</ScrollArea>
							)}
						</div>
					</div>

					<DialogFooter className="sm:justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setIsAddMemberDialogOpen(false);
								setSelectedUserIds([]);
							}}
							disabled={addingUser}
						>
							{t("common.cancel") || "Cancel"}
						</Button>
						<Button
							type="button"
							onClick={handleAddMembers}
							disabled={selectedUserIds.length === 0 || addingUser}
						>
							{addingUser ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("common.adding") || "Adding..."}
								</>
							) : (
								<>
									<UserPlus className="mr-2 h-4 w-4" />
									{t("teams.addMembers") || "Add Members"}
									{selectedUserIds.length > 0 && ` (${selectedUserIds.length})`}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Add Admin Dialog */}
			<Dialog
				open={isAddAdminDialogOpen}
				onOpenChange={setIsAddAdminDialogOpen}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("teams.addAdmins") || "Add Admins"}</DialogTitle>
						<DialogDescription>
							{t("teams.addAdminsDescription") ||
								"Select users to add as administrators to this team."}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col space-y-4 py-4">
						<div className="flex items-center px-3 py-2 rounded-md border">
							<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<input
								className="flex w-full bg-transparent outline-none placeholder:text-muted-foreground"
								placeholder={t("teams.searchUsers") || "Search users..."}
								value={userSearchQuery}
								onChange={(e) => handleUserSearch(e.target.value)}
							/>
							{userSearchQuery && (
								<Button
									variant="ghost"
									onClick={() => {
										setUserSearchQuery("");
										fetchAvailableUsers("");
									}}
									className="h-6 w-6 p-0 rounded-md"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>

						{selectedUserIds.length > 0 && (
							<div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
								<p className="w-full text-xs text-muted-foreground mb-1">
									{t("teams.selectedUsers", {
										count: selectedUserIds.length,
									}) || `${selectedUserIds.length} users selected`}
								</p>
								{selectedUserIds.map((id) => {
									const user = availableUsers.find((u) => u.id === id);
									if (!user) return null;
									return (
										<div
											key={id}
											className="flex items-center gap-1 text-xs bg-background rounded-full pl-2 pr-1 py-1"
										>
											<span>
												{user.first_name} {user.last_name}
											</span>
											<Button
												variant="ghost"
												onClick={() => toggleUserSelection(id)}
												className="h-4 w-4 p-0 rounded-full"
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									);
								})}
							</div>
						)}

						<div className="border rounded-md">
							{loadingAvailableUsers ? (
								<div className="flex items-center justify-center p-6">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : availableUsers.length === 0 ? (
								<p className="p-6 text-center text-sm text-muted-foreground">
									{t("teams.noUsersFound") || "No users found."}
								</p>
							) : (
								<ScrollArea className="h-72">
									<div className="p-1">
										{availableUsers.map((user) => (
											<div
												key={user.id}
												onClick={() => toggleUserSelection(user.id)}
												className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${
													selectedUserIds.includes(user.id) ? "bg-muted" : ""
												}`}
											>
												<div className="flex items-center gap-2">
													<Avatar className="h-8 w-8">
														<AvatarFallback>
															{getUserInitials(user.first_name, user.last_name)}
														</AvatarFallback>
													</Avatar>
													<div>
														<p className="text-sm font-medium">
															{user.first_name} {user.last_name}
														</p>
														<p className="text-xs text-muted-foreground">
															{user.username}
														</p>
													</div>
												</div>
												{selectedUserIds.includes(user.id) && (
													<Check className="h-4 w-4 text-primary" />
												)}
											</div>
										))}
									</div>
								</ScrollArea>
							)}
						</div>
					</div>

					<DialogFooter className="sm:justify-between">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setIsAddAdminDialogOpen(false);
								setSelectedUserIds([]);
							}}
							disabled={addingUser}
						>
							{t("common.cancel") || "Cancel"}
						</Button>
						<Button
							type="button"
							onClick={handleAddAdmins}
							disabled={selectedUserIds.length === 0 || addingUser}
						>
							{addingUser ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("common.adding") || "Adding..."}
								</>
							) : (
								<>
									<UserPlus className="mr-2 h-4 w-4" />
									{t("teams.addAdmins") || "Add Admins"}
									{selectedUserIds.length > 0 && ` (${selectedUserIds.length})`}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Remove User Dialog */}
			<AlertDialog
				open={isRemoveUserDialogOpen}
				onOpenChange={setIsRemoveUserDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("teams.removeUser") || "Remove User"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("teams.removeUserConfirmation") ||
								"Are you sure you want to remove this user from the team?"}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={removingUser}>
							{t("common.cancel") || "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleRemoveMember();
							}}
							disabled={removingUser}
							className="bg-destructive hover:bg-destructive/90"
						>
							{removingUser ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("common.removing") || "Removing..."}
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									{t("common.remove") || "Remove"}
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
