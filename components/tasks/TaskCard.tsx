import React, { useState } from "react";
import { useLanguage } from "@/lib/language-provider";
import { formatDate } from "@/lib/date-utils";
import {
	Task,
	TaskStatusBackend,
	TaskPriorityBackend,
	User,
} from "@/lib/types";
import { Clock, ExternalLink, Pencil, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerFooter,
	DrawerClose,
} from "@/components/ui/drawer";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import ApiService from "@/lib/api";
import { useRouter } from "next/navigation";

interface TaskCardProps {
	task: Task;
	onEdit: (task: Task) => void;
	onDelete: (task: Task, event?: React.MouseEvent) => void;
	onDragStart: (task: Task) => void;
	isCreatedByMe?: boolean;
	onPriorityChange?: (task: Task, newPriority: number) => void;
	onArchive?: (task: Task, event?: React.MouseEvent) => void;
}

// Helper function to ensure we're working with an array
const ensureArray = (value: any): any[] => {
	if (value === null || value === undefined) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
};

export function TaskCard({
	task,
	onEdit,
	onDelete,
	onDragStart,
	isCreatedByMe = false,
	onPriorityChange,
	onArchive,
}: TaskCardProps) {
	const { t } = useLanguage();
	// Check if we're on desktop
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const router = useRouter();

	// State for assigned users drawer/dialog
	const [showAssignedUsers, setShowAssignedUsers] = useState(false);
	const [fullTaskData, setFullTaskData] = useState<Task | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Function to fetch full task data including complete user information
	const fetchFullTaskData = async () => {
		if (!task?.id) return;

		try {
			setLoading(true);
			setError(null);
			const response = await ApiService.getTask(task.id.toString());
			setFullTaskData(response.data);
		} catch (err) {
			console.error("Error fetching task details:", err);
			setError("Failed to load user details");
		} finally {
			setLoading(false);
		}
	};

	// Helper functions for status and priority labels
	const getStatusLabel = (status: number): string => {
		switch (status) {
			case TaskStatusBackend.ASSIGNED:
				return t("tasks.assigned") || "Assigned";
			case TaskStatusBackend.RECEIVED:
				return t("tasks.received") || "Received";
			case TaskStatusBackend.IN_PROCESS:
				return t("tasks.inProcess") || "In Process";
			case TaskStatusBackend.COMPLETED:
				return t("tasks.completed") || "Completed";
			default:
				return "Unknown";
		}
	};

	const getPriorityLabel = (priority: number): string => {
		switch (priority) {
			case TaskPriorityBackend.MEDIUM:
				return t("tasks.priorityMedium") || "Medium";
			case TaskPriorityBackend.HIGH:
				return t("tasks.priorityHigh") || "High";
			default:
				return "Low";
		}
	};

	// Color schemes for priority and status
	const getStatusColor = (status: number): string => {
		switch (status) {
			case TaskStatusBackend.ASSIGNED:
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
			case TaskStatusBackend.RECEIVED:
				return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
			case TaskStatusBackend.IN_PROCESS:
				return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
			case TaskStatusBackend.COMPLETED:
				return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
			default:
				return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
		}
	};

	const getPriorityColor = (priority: number): string => {
		switch (priority) {
			case TaskPriorityBackend.MEDIUM:
				return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
			case TaskPriorityBackend.HIGH:
				return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
			default:
				return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300";
		}
	};

	// Event handlers
	const handleDelete = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onDelete(task, e);
	};

	const handleArchive = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (onArchive) {
			onArchive(task, e);
		}
	};

	const handlePriorityChange = (newPriority: number) => {
		if (onPriorityChange) {
			onPriorityChange(task, newPriority);
		}
	};

	return (
		<div
			className="bg-card rounded-lg shadow-sm border p-4 mb-4 hover:shadow-md transition-all hover:translate-y-[-2px] relative overflow-hidden group"
			draggable
			onDragStart={(e) => {
				if (onDragStart) {
					e.stopPropagation();
					onDragStart(task);
				}
			}}
		>
			{/* Status indicator line at the top */}
			<div
				className={cn(
					"absolute top-0 left-0 w-full h-1",
					task.status === TaskStatusBackend.ASSIGNED
						? "bg-yellow-400"
						: task.status === TaskStatusBackend.IN_PROCESS
						? "bg-blue-400"
						: task.status === TaskStatusBackend.COMPLETED
						? "bg-green-400"
						: "bg-slate-300"
				)}
			/>

			<div className="flex justify-between items-start mb-2 mt-1">
				<h3 className="text-base font-medium line-clamp-2">{task.name}</h3>
				<div className="flex space-x-1">
					{isCreatedByMe && (
						<Button
							variant="ghost"
							size="icon"
							onClick={async (e) => {
								e.stopPropagation();

								// Fetch full task data with assigned users before editing
								if (onEdit) {
									try {
										// Always fetch the latest data when editing to ensure we have complete user objects
										await fetchFullTaskData();

										// Create a modified task object with the full user data
										if (fullTaskData && fullTaskData.assigned_user) {
											// Create a new task object with the complete assigned_user array
											const enhancedTask = {
												...task,
												assigned_user: fullTaskData.assigned_user,
											};
											onEdit(enhancedTask);
										} else {
											// Fall back to the original task if we couldn't get the full data
											onEdit(task);
										}
									} catch (error) {
										console.error(
											"Error fetching task data for editing:",
											error
										);
										// Fall back to using the original task data
										onEdit(task);
									}
								}
							}}
							className="text-muted-foreground hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
							aria-label={t("tasks.editTask") || "Edit Task"}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					)}
					{isCreatedByMe && (
						<Button
							variant="ghost"
							size="icon"
							onClick={handleDelete}
							className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
							aria-label={t("tasks.deleteTask") || "Delete Task"}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
					{isCreatedByMe && onArchive && (
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100"
							onClick={handleArchive}
							aria-label={t("tasks.archiveTask") || "Archive Task"}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect width="20" height="5" x="2" y="3" rx="1" />
								<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
								<path d="M10 12h4" />
							</svg>
						</Button>
					)}
				</div>
			</div>

			{task.description && (
				<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
					{task.description}
				</p>
			)}

			<div className="flex flex-col space-y-3">
				<div className="flex flex-wrap gap-2">
					<div
						className={cn(
							"text-xs px-2 py-0.5 rounded-full border",
							getStatusColor(task.status)
						)}
					>
						{getStatusLabel(task.status)}
					</div>

					{onPriorityChange && (
						<div
							className={cn(
								"text-xs px-2 py-0.5 rounded-full cursor-pointer border transition-colors",
								getPriorityColor(task.priority)
							)}
							onClick={(e) => {
								e.stopPropagation();
								// Cycle through priority levels: Low (1) -> Medium (2) -> High (3) -> Low (1)
								const nextPriority =
									task.priority === 1 // Low
										? 2 // Medium
										: task.priority === 2 // Medium
										? 3 // High
										: 1; // Low
								handlePriorityChange(nextPriority);
							}}
						>
							{getPriorityLabel(task.priority)}
						</div>
					)}
				</div>

				{task.deadline && (
					<div className="flex items-center text-xs text-muted-foreground">
						<Clock className="w-3 h-3 mr-1.5" />
						<span>{formatDate(task.deadline)}</span>
					</div>
				)}
			</div>

			{/* Show assigned users section */}
			<div className="mt-3 pt-3 border-t border-border/50">
				{/* Display assigned users count */}
				<div className="flex items-center gap-2 mb-2">
					<Users className="h-3.5 w-3.5 text-muted-foreground" />
					<span className="text-xs text-muted-foreground">
						{task?.assigned_user && Array.isArray(task.assigned_user) && task.assigned_user.length > 0 ? (
							<>
								{task.assigned_user.length}
								{task.assigned_user.length === 1
									? t("tasks.assignedUser") || "assigned user"
									: t("tasks.assignedUsers") || "assigned users"}
							</>
						) : (
							<>{t("tasks.noUsersAssigned") || "No users assigned"}</>
						)}
					</span>
				</div>

				{/* Button to view assigned users */}
				<div className="space-y-2">
					<Button
						variant="outline"
						size="sm"
						className="w-full justify-center text-xs h-7 px-2 hover:bg-muted/50"
						onClick={(e) => {
							e.preventDefault(); // Prevent default behavior
							e.stopPropagation(); // Prevent opening the edit form
							fetchFullTaskData(); // Fetch full task data with complete user information
							setShowAssignedUsers(true);
						}}
					>
						<Users className="h-3.5 w-3.5 mr-1.5" />
						{t("tasks.viewAssignedPeople") || "View Assigned People"}
					</Button>

					{/* Go to Task button */}
					<Button
						variant="default"
						size="sm"
						className="w-full justify-center text-xs h-7 px-2"
						onClick={(e) => {
							e.preventDefault(); // Prevent default behavior
							e.stopPropagation(); // Prevent opening the edit form
							router.push(`/tasks/${task.id}`);
						}}
					>
						<ExternalLink className="h-3.5 w-3.5 mr-1.5" />
						{t("tasks.goToTask") || "Go to Task"}
					</Button>
				</div>
			</div>

			{/* Drawer for mobile devices */}
			{!isDesktop && (
				<Drawer
					open={showAssignedUsers}
					onOpenChange={(open) => {
						// Prevent default navigation
						if (!open) {
							// Use setTimeout with 0 delay to ensure this runs after the current event loop
							// This prevents the default navigation behavior
							setTimeout(() => {
								setShowAssignedUsers(false);
							}, 0);
							return false; // Prevent default behavior
						} else {
							setShowAssignedUsers(open);
						}
					}}
				>
					<DrawerContent
						onClick={(e) => {
							// Prevent event propagation to stop redirection
							e.stopPropagation();
						}}
					>
						<DrawerHeader className="text-left">
							<DrawerTitle>
								{t("tasks.assignedUsers") || "Assigned Users"}
							</DrawerTitle>
							<DrawerClose
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</DrawerClose>
						</DrawerHeader>
						<div className="px-4 pb-8">
							{loading ? (
								<div className="flex justify-center items-center py-12">
									<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
								</div>
							) : error ? (
								<div className="text-center p-4 text-red-500">{error}</div>
							) : (
								<div className="space-y-3 py-2">
									{ensureArray(fullTaskData?.assigned_user ?? task.assigned_user ?? [])
										.filter(
											(user: string | User | any) =>
												user && typeof user === "object" && user.id
										)
										.map((user: User | any) => (
											<div
												key={user.id}
												className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
											>
												<Avatar className="h-8 w-8">
													<AvatarFallback className="bg-primary/10 text-primary text-xs">
														{user.first_name?.[0] || ""}
														{user.last_name?.[0] || ""}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium">
														{user.first_name} {user.last_name}
													</p>
													<p className="text-xs text-muted-foreground">
														@{user.username}
														{user.position ? ` • ${user.position.name}` : ""}
													</p>
												</div>
											</div>
										))}
								</div>
							)}
						</div>
						<DrawerFooter>
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowAssignedUsers(false);
								}}
							>
								{t("common.close") || "Close"}
							</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}

			{/* Dialog for desktop */}
			{isDesktop && (
				<Dialog
					open={showAssignedUsers}
					onOpenChange={(open) => {
						// Prevent default navigation
						if (!open) {
							// Use setTimeout with 0 delay to ensure this runs after the current event loop
							// This prevents the default navigation behavior
							setTimeout(() => {
								setShowAssignedUsers(false);
							}, 0);
							return false; // Prevent default behavior
						} else {
							setShowAssignedUsers(open);
						}
					}}
				>
					<DialogContent
						className="sm:max-w-[400px]"
						onPointerDownOutside={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						onClick={(e) => {
							// Prevent event propagation to stop redirection
							e.stopPropagation();
						}}
					>
						<DialogHeader>
							<DialogTitle>
								{t("tasks.assignedUsers") || "Assigned Users"}
							</DialogTitle>
						</DialogHeader>
						{loading ? (
							<div className="flex justify-center items-center py-12">
								<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
							</div>
						) : error ? (
							<div className="text-center p-4 text-red-500">{error}</div>
						) : (
							<div className="max-h-[60vh] overflow-y-auto pr-1 -mr-1">
								<div className="space-y-2 py-1">
									{ensureArray(fullTaskData?.assigned_user ?? task.assigned_user ?? [])
										.filter(
											(user: string | User | any) =>
												user && typeof user === "object" && user.id
										)
										.map((user: User | any) => (
											<div
												key={user.id}
												className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
											>
												<Avatar className="h-9 w-9">
													<AvatarFallback className="bg-primary/10 text-primary">
														{user.first_name?.[0] || ""}
														{user.last_name?.[0] || ""}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="text-sm font-medium">
														{user.first_name} {user.last_name}
													</p>
													<div className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
														<span>@{user.username}</span>
														{user.position && (
															<>
																<span>•</span>
																<span>{user.position.name}</span>
															</>
														)}
														{user.region && (
															<>
																<span>•</span>
																<span>{user.region.name}</span>
															</>
														)}
													</div>
												</div>
											</div>
										))}
								</div>
							</div>
						)}
						<DialogFooter>
							<Button
								variant="outline"
								size="sm"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setShowAssignedUsers(false);
								}}
							>
								{t("common.close") || "Close"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}
