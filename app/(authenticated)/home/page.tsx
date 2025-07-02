"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	CalendarIcon,
	CheckCircle2,
	CircleDashed,
	Clock,
	ListChecks,
} from "lucide-react";
import {
	Task,
	User,
	Activity,
	Notification,
	TaskStatusBackend,
	TaskPriorityBackend,
} from "@/lib/types";

export default function HomePage() {
	const { user } = useAuth();
	const { t } = useLanguage();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [activities, setActivities] = useState<Activity[]>([]);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch dashboard data
	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);

				// Fetch tasks - get the latest 10 tasks
				const tasksResponse = await ApiService.getTasks();
				let tasksList = [];

				if (Array.isArray(tasksResponse)) {
					tasksList = tasksResponse.slice(0, 10);
				} else {
					tasksList = tasksResponse.data.results.slice(0, 10) || [];
				}

				// Sort tasks by creation date (newest first)
				tasksList.sort(
					(a, b) =>
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);

				setTasks(tasksList);

				// Generate activities based on tasks
				const recentActivities = tasksList
					.slice(0, Math.min(5, tasksList.length))
					.map((task: Task, index: number) => {
						return {
							id: `activity-${task.id}`,
							type: (task.status === TaskStatusBackend.COMPLETED
								? "completed"
								: task.status === TaskStatusBackend.ASSIGNED ||
								  task.status === TaskStatusBackend.IN_PROCESS
								? "updated"
								: "created") as "created" | "updated" | "completed",
							taskTitle: task.name,
							timestamp: formatDistanceToNow(new Date(task.updated_at), {
								addSuffix: true,
							}),
						};
					});

				setActivities(recentActivities);

				// Fetch notifications
				const notificationsResponse = await ApiService.getNotifications();
				if (Array.isArray(notificationsResponse)) {
					setNotifications(notificationsResponse.slice(0, 5));
				} else {
					setNotifications(
						notificationsResponse.data.results.slice(0, 5) || []
					);
				}

				setError(null);
			} catch (err) {
				console.error("Error fetching dashboard data:", err);
				setError("Failed to load dashboard data. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	// Count tasks by status
	const totalTasks = tasks ? tasks.length : 0;
	const inProgressTasks = tasks
		? tasks.filter((task) => task.status === 1).length
		: 0;
	const completedTasks = tasks
		? tasks.filter((task) => task.status === 2).length
		: 0;

	return (
		<div className="container mx-auto py-8">
			<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold">
						{t("home.welcome")}, {user?.first_name || user?.username}!
					</h1>
					<p className="text-muted-foreground mt-1">{t("home.description")}</p>
				</div>
				<div className="mt-4 md:mt-0">
					<Button asChild>
						<Link href="/tasks">
							<ListChecks className="mr-2 h-4 w-4" />
							{t("home.manageTasks")}
						</Link>
					</Button>
				</div>
			</div>

			{/* Loading and error states */}
			{loading ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				</div>
			) : error ? (
				<div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
					{error}
				</div>
			) : (
				<div className="flex flex-wrap gap-6">
					{/* Task Statistics */}
					<Card className="w-full md:w-1/2 lg:w-1/3">
						<CardHeader className="pb-2">
							<CardTitle>{t("home.taskStats")}</CardTitle>
							<CardDescription>{t("home.quickStats")}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-4">
								<div className="flex items-center justify-between p-2 border rounded-lg">
									<div className="flex items-center">
										<ListChecks className="mr-3 h-5 w-5 text-primary" />
										<span>{t("home.totalTasks")}</span>
									</div>
									<Badge variant="outline" className="text-lg font-semibold">
										{totalTasks}
									</Badge>
								</div>
								<div className="flex items-center justify-between p-2 border rounded-lg">
									<div className="flex items-center">
										<CircleDashed className="mr-3 h-5 w-5 text-yellow-500" />
										<span>{t("home.inProgressTasks")}</span>
									</div>
									<Badge
										variant="outline"
										className="text-lg font-semibold bg-yellow-100 dark:bg-yellow-900/30"
									>
										{inProgressTasks}
									</Badge>
								</div>
								<div className="flex items-center justify-between p-2 border rounded-lg">
									<div className="flex items-center">
										<CheckCircle2 className="mr-3 h-5 w-5 text-green-500" />
										<span>{t("home.completedTasks")}</span>
									</div>
									<Badge
										variant="outline"
										className="text-lg font-semibold bg-green-100 dark:bg-green-900/30"
									>
										{completedTasks}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Recent Tasks */}
					<Card className="w-full">
						<CardHeader className="pb-2">
							<div className="flex justify-between items-center">
								<CardTitle>{t("home.recentTasks")}</CardTitle>
								<Button variant="ghost" size="sm" asChild>
									<Link href="/tasks">{t("home.viewAllTasks")}</Link>
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{tasks.length > 0 ? (
								<div className="grid gap-3">
									{tasks.slice(0, 5).map((task) => {
										// Determine priority badge color
										const priorityVariants = {
											[TaskPriorityBackend.MEDIUM]:
												"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
											[TaskPriorityBackend.HIGH]:
												"bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
										};

										// Determine priority label
										const priorityLabels = {
											[TaskPriorityBackend.MEDIUM]:
												t("tasks.priorityMedium") || "Medium",
											[TaskPriorityBackend.HIGH]:
												t("tasks.priorityHigh") || "High",
										};

										// Determine status label
										const statusLabels = {
											[TaskStatusBackend.ASSIGNED]:
												t("tasks.assigned") || "Assigned",
											[TaskStatusBackend.RECEIVED]:
												t("tasks.received") || "Received",
											[TaskStatusBackend.IN_PROCESS]:
												t("tasks.inProcess") || "In Process",
											[TaskStatusBackend.COMPLETED]:
												t("tasks.completed") || "Completed",
										};

										// Format deadline
										const deadline = task.deadline
											? new Date(task.deadline)
											: null;
										const formattedDeadline = deadline
											? deadline.toLocaleDateString()
											: "";
										const isOverdue = deadline
											? new Date() > deadline && task.status !== 2
											: false;

										// Normalize assignees to an array for display
										const assignees = Array.isArray(task.assigned_users)
											? task.assigned_users
											: task.assigned_user
											? [
													typeof task.assigned_user === "object"
														? (task.assigned_user as any)
														: // minimal placeholder if we only have an ID
														  ({
																id: task.assigned_user,
																first_name: "",
																last_name: "",
														  } as any),
											  ]
											: [];

										return (
											<Link
												href={`/tasks/${task.id}`}
												key={task.id}
												className="block"
											>
												<div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
													<div className="flex justify-between items-start gap-2">
														<h3 className="font-medium line-clamp-1">
															{task.name}
														</h3>
														<Badge
															variant="outline"
															className={
																priorityVariants[
																	task.priority as TaskPriorityBackend
																]
															}
														>
															{priorityLabels[
																task.priority as TaskPriorityBackend
															] || "Medium"}
														</Badge>
													</div>

													<div className="flex flex-wrap gap-2 mt-2 text-xs">
														<Badge variant="secondary">
															{statusLabels[task.status as TaskStatusBackend] ||
																"Unknown Status"}
														</Badge>
														{deadline && (
															<Badge
																variant="outline"
																className={
																	isOverdue
																		? "border-destructive text-destructive"
																		: ""
																}
															>
																<CalendarIcon className="mr-1 h-3 w-3" />
																{isOverdue
																	? t("home.overdue")
																	: t("home.due")}: {formattedDeadline}
															</Badge>
														)}
													</div>

													{assignees.length > 0 && (
														<div className="mt-2 flex items-center gap-1">
															<span className="text-xs text-muted-foreground">
																{t("home.assignedTo")}:
															</span>
															<div className="flex -space-x-2">
																{assignees.map((user, index) => (
																	<div
																		key={index}
																		className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium"
																		title={`${user.first_name} ${user.last_name}`}
																	>
																		{user.first_name?.charAt(0)}
																		{user.last_name?.charAt(0)}
																	</div>
																))}
															</div>
														</div>
													)}
												</div>
											</Link>
										);
									})}
								</div>
							) : (
								<p className="text-center text-muted-foreground py-8">
									{t("tasks.noTasks")}
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
