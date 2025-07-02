"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Loader2, Home, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
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
import ApiService from "@/lib/api";
import { useLanguage } from "@/lib/language-provider";
import { useAuth } from "@/lib/auth";
import { TaskSection } from "@/components/tasks/TaskSection";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { Task as BackendTask, TaskStatusBackend, TaskPriorityBackend, User } from "@/lib/types";

// Custom form data interface to avoid conflict with browser's FormData
interface TaskFormData {
  name: string;
  description: string | null;
  status: TaskStatusBackend;
  is_checked: boolean;
  priority: TaskPriorityBackend;
  team: number | null;
  assigned_user: string[] | string | null;
  deadline: string | null;
}

// Team member interface
interface TeamMember {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  position?: {
    id: number;
    name: string;
  };
}

// Team interface
interface Team {
  id: number;
  name: string;
  description: string;
  owner: TeamMember;
  admins: TeamMember[];
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export default function TeamTasksPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to filter tasks by team ID
  const filterTasksByTeam = (tasks: BackendTask[] | any[]) => {
    if (!team || !id) return [];
    return tasks.filter(task => 
      task.team && task.team.id === Number(id)
    );
  };

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

  // Check if we have an edit parameter in the URL
  const editTaskId = searchParams.get("edit");

  // Using the TaskFormData interface defined above
  const [formData, setFormData] = useState<TaskFormData>({
    name: "",
    description: null,
    status: TaskStatusBackend.ASSIGNED,
    is_checked: false,
    priority: TaskPriorityBackend.MEDIUM,
    team: null,
    assigned_user: [],
    deadline: null,
  });

  // Check if current user is admin or owner
  const isAdminOrOwner = () => {
    if (!team || !user) return false;
    
    // Check if user is the owner
    if (team.owner.id === user.id) return true;
    
    // Check if user is an admin
    return team.admins.some(admin => admin.id === user.id);
  };

  // Prepare users for task assignment
  const prepareUsers = () => {
    if (!team) return;
    
    const allUsers = [
      team.owner,
      ...team.admins,
      ...team.members
    ].filter(Boolean);
    
    // Remove duplicates by id
    const uniqueUsers = allUsers.filter((user, index, self) =>
      index === self.findIndex((u) => u.id === user.id)
    );
    
    setUsers(uniqueUsers);
  };

  // Fetch team data
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getTeam(id as string);
        setTeam(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching team:", err);
        setError("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTeam();
    }
  }, [id]);

  // Prepare users for task assignment when team data is loaded
  useEffect(() => {
    if (team) {
      prepareUsers();
    }
  }, [team]);

  // Fetch team tasks
  useEffect(() => {
    const fetchTeamTasks = async () => {
      if (!id) return;
      
      try {
        setLoadingTasks(true);
        // Use the new getTeamTasks method to directly fetch tasks for this team
        const response = await ApiService.getTeamTasks(id.toString(), true);
        
        if (Array.isArray(response)) {
          setTeamTasks(response);
        } else {
          setTeamTasks(response.data.results || []);
        }
        
        setTaskError(null);
      } catch (err) {
        console.error("Error fetching team tasks:", err);
        setTaskError("Failed to load team tasks");
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTeamTasks();
  }, [id]);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // Handle task creation/update submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return; // Don't submit if name is empty
    }
    
    try {
      setSavingTask(true);
      
      // Prepare task data
      const taskData = {
        ...formData,
        team: team?.id || null,
        // Ensure assigned_user is properly formatted as an array of strings
        assigned_user: formData.assigned_user && Array.isArray(formData.assigned_user) ? formData.assigned_user.map((userId: string | number | { id: string | number }) => 
          typeof userId === 'object' ? userId.id.toString() : userId.toString()
        ) : []
      };
      
      if (selectedTask) {
        // Update existing task
        await ApiService.updateTask(selectedTask.id.toString(), taskData);
      } else {
        // Create new task
        await ApiService.createTask(taskData);
      }
      
      // Refresh tasks
      if (!id) return;
      const response = await ApiService.getTeamTasks(id.toString());
      if (Array.isArray(response)) {
        setTeamTasks(response);
      } else {
        setTeamTasks(response.data.results);
      }
      
      // Reset form and close dialog/drawer
      setFormData({
        name: "",
        description: null,
        status: TaskStatusBackend.ASSIGNED,
        is_checked: false,
        priority: TaskPriorityBackend.MEDIUM,
        team: null,
        assigned_user: [],
        deadline: null,
      });
      
      setSelectedTask(null);
      setIsDialogOpen(false);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setSavingTask(false);
    }
  };

  // Handle adding a new task
  const handleAddTask = () => {
    setSelectedTask(null);
    setFormData({
      name: "",
      description: null,
      status: TaskStatusBackend.ASSIGNED,
      is_checked: false,
      priority: TaskPriorityBackend.MEDIUM,
      team: team?.id || null,
      assigned_user: [],
      deadline: null,
    });
    
    if (isMobile) {
      setIsDrawerOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  };

  // Handle editing a task
  const handleEditTask = (task: BackendTask) => {
    setSelectedTask(task);
    
    // Prepare form data from task
    setFormData({
      name: task.name,
      description: task.description || null,
      status: task.status,
      is_checked: task.is_checked || false,
      priority: task.priority,
      // Handle team which could be a number or an object with id property
      team: (() => {
        if (typeof task.team === 'number') return task.team;
        if (task.team && typeof task.team === 'object') {
          const teamObj = task.team as { id?: number };
          return teamObj.id || null;
        }
        return null;
      })(),
      // Handle assigned_user which could be an array of User objects or strings
      assigned_user: (() => {
        if (!task.assigned_user) return [];
        if (!Array.isArray(task.assigned_user)) return [];
        
        return task.assigned_user.map(user => {
          if (typeof user === 'string') return user;
          if (user && typeof user === 'object') {
            const userObj = user as { id?: number | string };
            return userObj.id ? String(userObj.id) : '';
          }
          return '';
        }).filter(Boolean);
      })(),
      deadline: task.deadline || null,
    });
    
    if (isMobile) {
      setIsDrawerOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  };

  // Handle task deletion
  const handleDeleteTask = (task: BackendTask) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  // Confirm task deletion
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      setIsDeleting(true);
      await ApiService.deleteTask(taskToDelete.id.toString());
      
      // Refresh tasks
      const response = await ApiService.getTeamTasks(id?.toString() || '');
      if (Array.isArray(response)) {
        const filteredTasks = response.filter(task => {
          // If task has no team, check if it belongs to this team by other means
          if (!task.team || !task.team.id) {
            return task.team_id === Number(id) || task.team_id?.toString() === id?.toString();
          }
          // Otherwise check by team id
          return task.team.id.toString() === id?.toString();
        });
        setTeamTasks(filteredTasks);
      } else {
        const filteredTasks = (response.data.results || []).filter(task => {
          // If task has no team, check if it belongs to this team by other means
          if (!task.team || !task.team.id) {
            return task.team_id === Number(id) || task.team_id?.toString() === id?.toString();
          }
          // Otherwise check by team id
          return task.team.id.toString() === id?.toString();
        });
        setTeamTasks(filteredTasks);
      }
      
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
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
  const handleDrop = async (status: TaskStatusBackend) => {
    if (!draggedTask) return;
    
    try {
      // Update task status
      const updatedTask = { ...draggedTask, status };
      await ApiService.updateTask(draggedTask.id.toString(), updatedTask);
      
      // Refresh tasks
      const response = await ApiService.getTeamTasks(id?.toString() || '');
      if (Array.isArray(response)) {
        const filteredTasks = response.filter(task => {
          // If task has no team, check if it belongs to this team by other means
          if (!task.team || !task.team.id) {
            return task.team_id === Number(id) || task.team_id?.toString() === id?.toString();
          }
          // Otherwise check by team id
          return task.team.id.toString() === id?.toString();
        });
        setTeamTasks(filteredTasks);
      } else {
        const filteredTasks = (response.data.results || []).filter(task => {
          // If task has no team, check if it belongs to this team by other means
          if (!task.team || !task.team.id) {
            return task.team_id === Number(id) || task.team_id?.toString() === id?.toString();
          }
          // Otherwise check by team id
          return task.team.id.toString() === id?.toString();
        });
        setTeamTasks(filteredTasks);
      }
      
      setDraggedTask(null);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // Handle priority change
  const handlePriorityChange = (task: BackendTask, newPriority: number) => {
    // Convert number to TaskPriorityBackend if needed
    const priority = newPriority as TaskPriorityBackend;
    
    // Use the task.id instead of passing taskId directly
    (async () => {
      try {
        await ApiService.updateTask(task.id.toString(), { priority });
        
        // Refresh tasks
        const response = await ApiService.getTeamTasks(id?.toString() || '');
        if (Array.isArray(response)) {
          const filteredTasks = response.filter(task => 
            task.team && task.team.id === Number(id)
          );
          setTeamTasks(filteredTasks);
        } else {
          const filteredTasks = (response.data.results || []).filter(task => 
            task.team && task.team.id === Number(id)
          );
          setTeamTasks(filteredTasks);
        }
      } catch (error) {
        console.error("Error updating task priority:", error);
      }
    })();
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <Breadcrumb>
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
              <BreadcrumbLink className="flex items-center gap-1" href={`/teams/${id}`}>
                {team ? team.name : t("teams.loading") || "Loading..."}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <ClipboardList className="h-4 w-4 mr-1 inline" />
                {t("teams.tasks") || "Tasks"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {team ? `${team.name} ${t("teams.tasks") || "Tasks"}` : t("teams.loading") || "Loading..."}
          </h1>
        </div>
        <Button onClick={handleAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          {t("tasks.addTask") || "Add Task"}
        </Button>
      </div>
      
      <Separator />
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/teams")}>
            {t("teams.backToTeams") || "Back to Teams"}
          </Button>
        </div>
      ) : team ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t("teams.teamTasks") || "Team Tasks"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaskSection
              tasks={teamTasks}
              loading={loadingTasks}
              error={taskError}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onPriorityChange={handlePriorityChange}
            />
          </CardContent>
        </Card>
      ) : null}
      
      {/* Task Dialog (Desktop) */}
      <TaskDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        formData={formData as any}
        setFormData={setFormData as any}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        selectedTask={selectedTask}
        teams={[team].filter(Boolean) as any}
        users={users}
        loadingTeams={false}
        loadingUsers={loadingUsers}
        teamSearch={teamSearch}
        userSearch={userSearch}
        setTeamSearch={setTeamSearch}
        setUserSearch={setUserSearch}
        selectedTeam={team}
        savingTask={savingTask}
      />
      
      {/* Task Drawer (Mobile) */}
      <TaskDrawer
        isOpen={isDrawerOpen}
        setIsOpen={setIsDrawerOpen}
        formData={formData as any}
        setFormData={setFormData as any}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        selectedTask={selectedTask}
        teams={[team].filter(Boolean) as any}
        users={users}
        loadingTeams={false}
        loadingUsers={loadingUsers}
        teamSearch={teamSearch}
        userSearch={userSearch}
        setTeamSearch={setTeamSearch}
        setUserSearch={setUserSearch}
        selectedTeam={team}
        savingTask={savingTask}
      />
      
      {/* Delete Task Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("tasks.deleteTask") || "Delete Task"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("tasks.deleteConfirmation") || "Are you sure you want to delete this task? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteTask();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("common.delete") || "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
