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
import { Loader2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Task as BackendTask,
  User,
  Team,
  TaskStatusBackend,
  TaskPriorityBackend,
} from "@/lib/types";
import { TaskSection } from "@/components/tasks/TaskSection";

// Import our new components
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// Initial empty tasks array
const initialTasks: BackendTask[] = [];

export default function TasksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

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
  const [draggedTask, setDraggedTask] = useState<BackendTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<BackendTask | null>(null);
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
    status: TaskStatusBackend.ASSIGNED,
    is_checked: false,
    priority: TaskPriorityBackend.MEDIUM,
    team: null,
    assigned_users: [],
    deadline: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<BackendTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Fetch tasks assigned to the user
      const toMeResponse = await ApiService.getTasksToMe();
      if (Array.isArray(toMeResponse)) {
        setTasksToMe(toMeResponse);
      } else {
        setTasksToMe(toMeResponse.data.results);
      }

      // Fetch tasks created by the user
      const byMeResponse = await ApiService.getTasksByMe();
      if (Array.isArray(byMeResponse)) {
        setTasksByMe(byMeResponse);
      } else {
        setTasksByMe(byMeResponse.data.results);
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
            const isTaskCreatedByMe = typeof task.created_by === 'string' 
              ? task.created_by === '1' 
              : task.created_by.id.toString() === '1';
              
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
                assigned_users: task.assigned_users
                  ? task.assigned_users
                      .filter((user: User) => user && user.id)
                      .map((user: User) => user.id.toString())
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
              alert(t('tasks.onlyStatusChangesAllowed') || 'You can only change the status of tasks assigned to you');
            }
            
            // Clear the edit parameter from the URL
            router.replace('/tasks');
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
        status: TaskStatusBackend.ASSIGNED, // New tasks always start as assigned
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

      // Call API to delete the task
      await ApiService.deleteTask(taskToDelete.id.toString());

      // Update UI after successful deletion
      // Update the appropriate task list based on who created the task
      const isTaskByMe = taskToDelete.created_by.toString() === user?.id.toString();

      if (isTaskByMe) {
        setTasksByMe((prevTasks) =>
          prevTasks.filter((task) => task.id !== taskToDelete.id)
        );
      }

      // Also update tasksToMe if the task was assigned to the current user
      const isTaskToMe = taskToDelete.assigned_users.some((u) =>
        u.toString() === user?.id.toString()
      );

      if (isTaskToMe) {
        setTasksToMe((prevTasks) =>
          prevTasks.filter((task) => task.id !== taskToDelete.id)
        );
      }

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
      // Update task status in UI first for immediate feedback
      // Update the appropriate task list based on who created the task
      const isTaskByMe =
        typeof draggedTask.created_by === "string"
          ? draggedTask.created_by === "1"
          : draggedTask.created_by.id.toString() === "1";

      if (isTaskByMe) {
        setTasksByMe((prevTasks) =>
          prevTasks.map((task) =>
            task.id === draggedTask.id ? { ...task, status } : task
          )
        );
      }

      // Also update tasksToMe if the task was assigned to the current user
      const isTaskToMe = draggedTask.assigned_users.some((user) =>
        typeof user === "string" ? user === "1" : user.id.toString() === "1"
      );

      if (isTaskToMe) {
        setTasksToMe((prevTasks) =>
          prevTasks.map((task) =>
            task.id === draggedTask.id ? { ...task, status } : task
          )
        );
      }

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

  // Get active tab from URL or default to "to-me"
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam === "by-me" ? "by-me" : "to-me");

  // We now get tasks from separate API endpoints, so no need to filter

  // Handle priority change for mobile devices
  const handlePriorityChange = async (
    task: BackendTask,
    newPriority: number
  ) => {
    try {
      // Update UI first for immediate feedback
      if (activeTab === "by-me") {
        setTasksByMe((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, priority: newPriority } : t
          )
        );
      } else if (activeTab === "to-me") {
        setTasksToMe((prevTasks) =>
          prevTasks.map((t) =>
            t.id === task.id ? { ...t, priority: newPriority } : t
          )
        );
      }

      // Update task priority in API
      await ApiService.updateTask(task.id.toString(), {
        priority: newPriority,
      });
    } catch (error) {
      console.error("Error updating task priority:", error);
      // Revert UI changes if API call fails
      fetchTasks();
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{tasksTitle}</h1>
        <Button onClick={handleAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          {addTaskLabel}
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // Update URL when tab changes without full page reload
        router.push(`/tasks?tab=${value}`, { scroll: false });
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="to-me">To Me</TabsTrigger>
          <TabsTrigger value="by-me">By Me</TabsTrigger>
        </TabsList>

        <TabsContent value="to-me" className="mt-0">
          <TaskSection
            tasks={tasksToMe}
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
            tasks={tasksByMe}
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
