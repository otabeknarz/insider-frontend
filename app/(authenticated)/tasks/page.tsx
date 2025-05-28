"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import { Plus, Loader2 } from "lucide-react";
import { Task, User, Team, TaskStatus, TaskPriority } from "@/lib/types";

// Import our new components
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskDialog } from "@/components/tasks/TaskDialog";

// Initial empty tasks array
const initialTasks: Task[] = [];

export default function TasksPage() {
  const { t } = useLanguage();

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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Team and user states
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  interface FormData {
    name: string;
    description: string;
    status: number;
    is_checked: boolean;
    priority: number;
    team: number | null;
    assigned_users: string[];
    deadline: string;
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    status: TaskStatus.ASSIGNED,
    is_checked: false,
    priority: TaskPriority.MEDIUM,
    team: null,
    assigned_users: [],
    deadline: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getTasks();
      // Handle both possible return types
      if (Array.isArray(response)) {
        // If response is already an array of tasks
        setTasks(response);
      } else {
        // If response is an AxiosResponse with data.results
        setTasks(response.data.results);
      }
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

  useEffect(() => {
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
  }, []);

  // Load teams and users
  useEffect(() => {
    const fetchTeamsAndUsers = async () => {
      if (!isDrawerOpen && !isDialogOpen) return;

      try {
        setLoadingTeams(true);
        setLoadingUsers(true);

        // Fetch teams
        const teamsResponse = await ApiService.getTeams(undefined, true);
        if (Array.isArray(teamsResponse)) {
          setTeams(teamsResponse);
        } else {
          setTeams(teamsResponse.data.results || []);
        }

        // Fetch users
        const usersResponse = await ApiService.getUsers(undefined, true);
        if (Array.isArray(usersResponse)) {
          setUsers(usersResponse);
        } else {
          setUsers(usersResponse.data.results || []);
        }
      } catch (err) {
        console.error("Error fetching teams and users:", err);
      } finally {
        setLoadingTeams(false);
        setLoadingUsers(false);
      }
    };

    fetchTeamsAndUsers();
  }, [isDrawerOpen, isDialogOpen]);

  // Update available users when team is selected
  useEffect(() => {
    if (formData.team !== null) {
      const team = teams.find((t) => t.id === formData.team);
      setSelectedTeam(team || null);

      // Clear selected users if they're not in the team
      if (team) {
        setFormData((prev) => ({
          ...prev,
          assigned_users: prev.assigned_users.filter((userId) =>
            team.members.some((member) => member.id.toString() === userId)
          ),
        }));
      }
    } else {
      setSelectedTeam(null);
    }
  }, [formData.team, teams]);

  // Filter tasks by status
  const assignedTasks = tasks.filter(
    (task) => task.status === TaskStatus.ASSIGNED
  );
  const receivedTasks = tasks.filter(
    (task) => task.status === TaskStatus.RECEIVED
  );
  const inProcessTasks = tasks.filter(
    (task) => task.status === TaskStatus.IN_PROCESS
  );
  const completedTasks = tasks.filter(
    (task) => task.status === TaskStatus.COMPLETED
  );

  // Filter users based on selected team
  const filteredUsers = selectedTeam
    ? users.filter((user) =>
        selectedTeam.members.some((member) => member.id === user.id)
      )
    : users;

  // Handle opening task form for creating a new task
  const handleAddTask = () => {
    setSelectedTask(null);
    setFormData({
      name: "",
      description: "",
      status: TaskStatus.ASSIGNED,
      is_checked: false,
      priority: TaskPriority.MEDIUM,
      team: null,
      assigned_users: [],
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
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      description: task.description,
      status: task.status,
      is_checked: task.is_checked || false,
      priority: task.priority,
      team: task.team,
      assigned_users: task.assigned_users
        ? task.assigned_users
            .filter((user) => user && user.id) // Filter out undefined users or users without id
            .map((user) => user.id.toString())
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
      return;
    }

    try {
      setSavingTask(true);

      // Format task data for API
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: TaskStatus.ASSIGNED, // New tasks always start as assigned
        is_checked: false,
        priority: Number(formData.priority),
        team: formData.team ? Number(formData.team) : null,
        assigned_users: formData.assigned_users,
        deadline: formData.deadline || null,
      };

      if (selectedTask) {
        // Update existing task
        await ApiService.updateTask(selectedTask.id.toString(), taskData);
      } else {
        // Create new task
        await ApiService.createTask(taskData);
      }

      handleTaskSaved();
    } catch (err) {
      console.error("Error saving task:", err);
      // Show error notification
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
  const handleDeleteTask = (task: Task, event?: React.MouseEvent) => {
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

      // Call API to delete the task
      await ApiService.deleteTask(taskToDelete.id.toString());

      // Update UI after successful deletion
      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== taskToDelete.id)
      );

      // Close the confirmation dialog
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      // You could set an error state here to show to the user
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle drag start
  const handleDragStart = (task: Task) => {
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
      // Update task status in UI first for immediate feedback
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === draggedTask.id ? { ...task, status } : task
        )
      );

      // Update task status in API
      await ApiService.updateTask(draggedTask.id.toString(), {
        status,
      });

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

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">{tasksTitle}</h1>
          <p className="text-muted-foreground text-sm">
            {t("tasks.description") === "tasks.description"
              ? "Manage and organize your tasks"
              : t("tasks.description")}
          </p>
        </div>
        <Button
          onClick={handleAddTask}
          className="flex items-center gap-2 self-start"
          size="default"
        >
          <Plus className="w-4 h-4" />
          <span>{addTaskLabel}</span>
        </Button>
      </div>

      <div>
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
      </div>

      {/* Loading and error states */}
      {loading && (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">
            {t("tasks.loading") === "tasks.loading"
              ? "Loading tasks..."
              : t("tasks.loading")}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6 border border-destructive/30 flex items-start gap-2">
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
            className="mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <h4 className="font-medium">
              {t("tasks.errorTitle") === "tasks.errorTitle"
                ? "Error Loading Tasks"
                : t("tasks.errorTitle")}
            </h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && tasks.length === 0 ? (
        <div className="bg-muted/50 rounded-lg p-10 text-center">
          <div className="flex justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="15" x2="13" y2="15" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t("tasks.noTasks") === "tasks.noTasks"
              ? "No Tasks Yet"
              : t("tasks.noTasks")}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t("tasks.createFirst") === "tasks.createFirst"
              ? "Create your first task to get started"
              : t("tasks.createFirst")}
          </p>
          <Button onClick={handleAddTask} className="mx-auto">
            <Plus className="mr-2 h-4 w-4" />
            {addTaskLabel}
          </Button>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <TaskColumn
              title={t("tasks.assigned") || "ASSIGNED"}
              tasks={assignedTasks}
              status={TaskStatus.ASSIGNED}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            <TaskColumn
              title={t("tasks.received") || "RECEIVED"}
              tasks={receivedTasks}
              status={TaskStatus.RECEIVED}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            <TaskColumn
              title={t("tasks.inProcess") || "IN PROCESS"}
              tasks={inProcessTasks}
              status={TaskStatus.IN_PROCESS}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            <TaskColumn
              title={t("tasks.completed") || "COMPLETED"}
              tasks={completedTasks}
              status={TaskStatus.COMPLETED}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          </div>
        )
      )}

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
