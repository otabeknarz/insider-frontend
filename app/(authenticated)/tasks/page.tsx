"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { Task, User, Team, TaskStatus, TaskPriority } from "@/lib/types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

// Initial empty tasks array
const initialTasks: Task[] = [];

export default function TasksPage() {
  const { t } = useLanguage();
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
    priority: number;
    team: number | null;
    assigned_users: number[];
    deadline: string;
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    status: TaskStatus.ASSIGNED,
    priority: TaskPriority.DEFAULT,
    team: null,
    assigned_users: [],
    deadline: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingTask, setSavingTask] = useState(false);

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
      setError("Failed to load tasks. Please try again later.");
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
            team.members.some((member) => Number(member.id) === userId)
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
      status: TaskStatus.ASSIGNED,
      priority: TaskPriority.DEFAULT,
      team: null,
      assigned_users: [],
      deadline: "",
    });

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
      priority: task.priority,
      team: task.team,
      assigned_users: task.assigned_users.map((user) => Number(user.id)),
      deadline: task.deadline || "",
    });

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
    setFormData((prev) => {
      let newValue: string | number | number[] | null = value;

      if (name === "team") {
        newValue = value ? Number(value) : null;
      } else if (name === "priority") {
        newValue = Number(value);
      } else if (name === "assigned_users") {
        newValue = Array.isArray(value) ? value : (value ? [Number(value)] : []);
      }

      return {
        ...prev,
        [name]: newValue,
      };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);

    try {
      const taskData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: TaskStatus.ASSIGNED, // New tasks always start as assigned
        priority: Number(formData.priority),
        team: formData.team ? Number(formData.team) : null,
        assigned_users: formData.assigned_users.map((id) => Number(id)),
        deadline: formData.deadline || null,
      };

      // Validate required fields
      if (!taskData.name) {
        throw new Error("Task name is required");
      }

      if (selectedTask) {
        await ApiService.updateTask(selectedTask.id.toString(), taskData);
      } else {
        await ApiService.createTask(taskData);
      }

      handleTaskSaved();
    } catch (err) {
      console.error("Error saving task:", err);
      setError(err instanceof Error ? err.message : "Failed to save task");
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
    fetchTasks();
  };

  // Filter tasks by status according to backend model
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
    if (draggedTask) {
      try {
        // Optimistically update UI
        const updatedTasks = tasks.map((task) =>
          task.id === draggedTask.id ? { ...task, status } : task
        );
        setTasks(updatedTasks);

        // Update only the status field using PATCH request
        await ApiService.updateTask(draggedTask.id.toString(), {
          status,
        });
      } catch (err) {
        console.error("Error updating task status:", err);
        // Revert to original state if update fails
        const originalTasks = await ApiService.getTasks();
        // Handle both possible return types
        if (Array.isArray(originalTasks)) {
          setTasks(originalTasks);
        } else {
          setTasks(originalTasks.data.results);
        }
      } finally {
        setDraggedTask(null);
      }
    }
  };

  // Task card component
  const TaskCard = ({ task }: { task: Task }) => {
    const priorityColors = {
      1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    const priorityLabels = {
      1: "Low",
      2: "Medium",
      3: "High",
    };

    const statusLabels = {
      0: "To Do",
      1: "In Progress",
      2: "Done",
    };

    // Check if task deadline is overdue
    const deadline = new Date(task.deadline);
    const isOverdue = new Date() > deadline && task.status !== 2;

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task)}
        className="bg-card border border-border rounded-md p-4 mb-3 shadow-sm cursor-move hover:shadow-md transition-shadow"
        onClick={() => (window.location.href = `/tasks/${task.id}`)}
      >
        <h3 className="font-medium mb-2">{task.name}</h3>
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              priorityColors[task.priority as 1 | 2 | 3]
            }`}
          >
            {priorityLabels[task.priority as 1 | 2 | 3]}
          </span>

          <span
            className={`text-xs px-2 py-1 rounded-full ${
              isOverdue
                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                : "bg-muted"
            }`}
          >
            {isOverdue ? "Overdue" : "Due"}:{" "}
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">
            {statusLabels[task.status as 0 | 1 | 2]}
          </span>

          {task.assigned_users && task.assigned_users.length > 0 && (
            <div className="flex -space-x-2">
              {task.assigned_users.slice(0, 3).map((user, index) => (
                <div
                  key={index}
                  className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium"
                  title={`${user.first_name || ""} ${user.last_name || ""}`}
                >
                  {user.first_name?.charAt(0) || ""}
                  {user.last_name?.charAt(0) || ""}
                </div>
              ))}
              {task.assigned_users.length > 3 && (
                <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                  +{task.assigned_users.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Column component
  const TaskColumn = ({
    title,
    tasks,
    status,
  }: {
    title: string;
    tasks: Task[];
    status: number;
  }) => {
    return (
      <div
        className="bg-muted/50 rounded-lg p-4 min-h-[500px] w-full"
        onDragOver={handleDragOver}
        onDrop={() => handleDrop(status)}
      >
        <h2 className="font-semibold mb-4 flex items-center justify-between">
          <span>{title}</span>
          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </h2>

        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  };

  const filteredTeams = teams.filter(
    (team) =>
      team.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      team.description.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const filteredUsers = users.filter(
    (user) =>
      `${user.first_name} ${user.last_name}`
        .toLowerCase()
        .includes(userSearch.toLowerCase()) ||
      user.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t("tasks.title")}</h1>
        <Button onClick={handleAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          {t("tasks.add")}
        </Button>

        {/* Mobile Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border bg-background sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-xl font-bold">
                  {selectedTask ? t("tasks.editTask") : t("tasks.addTask")}
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="px-4 py-4 overflow-y-auto">
              <form
                id="task-form-mobile"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Title */}
                <div className="space-y-2">
                  <label
                    htmlFor="name-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.name")}
                  </label>
                  <Input
                    id="name-mobile"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("tasks.namePlaceholder") || "Task name"}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label
                    htmlFor="description-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.description")}
                  </label>
                  <textarea
                    id="description-mobile"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={
                      t("tasks.descriptionPlaceholder") || "Task description"
                    }
                    className="w-full h-32 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Team */}
                <div className="space-y-2">
                  <label
                    htmlFor="team-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.team")}
                  </label>
                  <Select
                    name="team"
                    value={formData.team?.toString() || ""}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        team: value ? Number(value) : null,
                      }))
                    }
                  >
                    <SelectTrigger id="team-mobile">
                      <SelectValue
                        placeholder={t("tasks.selectTeam") || "Select team"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search teams..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <SelectItem value="">No team</SelectItem>
                      {loadingTeams ? (
                        <div className="p-2 text-center">
                          <div className="animate-spin h-4 w-4 mx-auto border-b-2 border-primary rounded-full"></div>
                        </div>
                      ) : (
                        filteredTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeam && (
                  <div className="rounded-md bg-blue-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-blue-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Only team members can be assigned to this task
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned Users */}
                <div className="space-y-2">
                  <label
                    htmlFor="assigned-users-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.assignedUsers")}
                  </label>
                  <Select
                    name="assigned_users"
                    value={
                      formData.assigned_users.length > 0
                        ? formData.assigned_users[0].toString()
                        : ""
                    }
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        assigned_users: value ? [Number(value)] : [],
                      }))
                    }
                  >
                    <SelectTrigger id="assigned-users-mobile">
                      <SelectValue
                        placeholder={
                          t("tasks.selectAssignedUsers") || "Select users"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {loadingUsers ? (
                        <div className="p-2 text-center">
                          <div className="animate-spin h-4 w-4 mx-auto border-b-2 border-primary rounded-full"></div>
                        </div>
                      ) : (
                        filteredUsers
                          .filter(
                            (user) =>
                              `${user.first_name} ${user.last_name}`
                                .toLowerCase()
                                .includes(userSearch.toLowerCase()) ||
                              user.username
                                .toLowerCase()
                                .includes(userSearch.toLowerCase())
                          )
                          .map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {`${user.first_name} ${user.last_name}`}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label
                    htmlFor="priority-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.priority")}
                  </label>
                  <Select
                    name="priority"
                    value={formData.priority.toString()}
                    onValueChange={(value) =>
                      handleChange({
                        target: { name: "priority", value: parseInt(value) },
                      } as any)
                    }
                  >
                    <SelectTrigger id="priority-mobile">
                      <SelectValue
                        placeholder={
                          t("tasks.selectPriority") || "Select priority"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TaskPriority.DEFAULT.toString()}>
                        {t("tasks.priorityDefault") || "Default"}
                      </SelectItem>
                      <SelectItem value={TaskPriority.HIGH.toString()}>
                        {t("tasks.priorityHigh") || "High"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <label
                    htmlFor="deadline-mobile"
                    className="block text-sm font-medium"
                  >
                    {t("tasks.deadline")}
                  </label>
                  <Input
                    id="deadline-mobile"
                    name="deadline"
                    type="datetime-local"
                    value={formData.deadline || ""}
                    onChange={handleChange}
                  />
                </div>
              </form>
            </div>

            <DrawerFooter className="border-t border-border">
              <Button
                type="submit"
                form="task-form-mobile"
                disabled={savingTask}
                className="w-full"
              >
                {savingTask ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("tasks.saving")}
                  </span>
                ) : selectedTask ? (
                  t("tasks.updateTask")
                ) : (
                  t("tasks.createTask")
                )}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Desktop Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-bold">
                {selectedTask ? t("tasks.editTask") : t("tasks.addTask")}
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
              <form
                id="task-form-desktop"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="name-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.name")}
                    </label>
                    <Input
                      id="name-desktop"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t("tasks.namePlaceholder") || "Task name"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="description-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.description")}
                    </label>
                    <textarea
                      id="description-desktop"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder={
                        t("tasks.descriptionPlaceholder") || "Task description"
                      }
                      className="w-full h-32 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="team-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.team")}
                    </label>
                    <Select
                      name="team"
                      value={formData.team?.toString() || "none"}
                      onValueChange={(value) =>
                        handleChange({
                          target: {
                            name: "team",
                            value: value === "none" ? null : value,
                          },
                        } as any)
                      }
                    >
                      <SelectTrigger id="team-desktop">
                        <SelectValue
                          placeholder={t("tasks.selectTeam") || "Select team"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Search teams..."
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <SelectItem value="none">No team</SelectItem>
                        {loadingTeams ? (
                          <div className="p-2 text-center">
                            <div className="animate-spin h-4 w-4 mx-auto border-b-2 border-primary rounded-full"></div>
                          </div>
                        ) : (
                          filteredTeams.map((team) => (
                            <SelectItem
                              key={team.id}
                              value={team.id.toString()}
                            >
                              {team.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTeam && (
                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-blue-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-blue-700">
                            Only team members can be assigned to this task
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label
                      htmlFor="assigned-users-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.assignedUsers")}
                    </label>
                    <Select
                      name="assigned_users"
                      value={formData.assigned_users[0]?.toString() || ""}
                      onValueChange={(value) =>
                        handleChange({
                          target: {
                            name: "assigned_users",
                            value: value ? [Number(value)] : [],
                          },
                        } as any)
                      }
                    >
                      <SelectTrigger id="assigned-users-desktop">
                        <SelectValue
                          placeholder={
                            t("tasks.selectAssignedUsers") || "Select users"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        {loadingUsers ? (
                          <div className="p-2 text-center">
                            <div className="animate-spin h-4 w-4 mx-auto border-b-2 border-primary rounded-full"></div>
                          </div>
                        ) : (
                          filteredUsers
                            .filter(
                              (user) =>
                                `${user.first_name} ${user.last_name}`
                                  .toLowerCase()
                                  .includes(userSearch.toLowerCase()) ||
                                user.username
                                  .toLowerCase()
                                  .includes(userSearch.toLowerCase())
                            )
                            .map((user) => (
                              <SelectItem
                                key={user.id}
                                value={user.id.toString()}
                              >
                                {`${user.first_name} ${user.last_name}`}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="priority-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.priority")}
                    </label>
                    <Select
                      name="priority"
                      value={formData.priority.toString()}
                      onValueChange={(value) =>
                        handleChange({
                          target: { name: "priority", value: parseInt(value) },
                        } as any)
                      }
                    >
                      <SelectTrigger id="priority-desktop">
                        <SelectValue
                          placeholder={
                            t("tasks.selectPriority") || "Select priority"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TaskPriority.DEFAULT.toString()}>
                          {t("tasks.priorityDefault") || "Default"}
                        </SelectItem>
                        <SelectItem value={TaskPriority.HIGH.toString()}>
                          {t("tasks.priorityHigh") || "High"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="deadline-desktop"
                      className="block text-sm font-medium"
                    >
                      {t("tasks.deadline")}
                    </label>
                    <Input
                      id="deadline-desktop"
                      name="deadline"
                      type="datetime-local"
                      value={formData.deadline || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Form Actions - Fixed at bottom */}
            <div className="px-6 py-4 border-t bg-muted/30">
              <div className="flex flex-row gap-2">
                <Button
                  type="submit"
                  form="task-form-desktop"
                  disabled={savingTask}
                  className="flex-1"
                >
                  {savingTask ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {t("tasks.saving")}
                    </span>
                  ) : selectedTask ? (
                    t("tasks.updateTask")
                  ) : (
                    t("tasks.createTask")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading and error states */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <TaskColumn
            title={t("tasks.assigned") || "ASSIGNED"}
            tasks={assignedTasks}
            status={TaskStatus.ASSIGNED}
          />
          <TaskColumn
            title={t("tasks.received") || "RECEIVED"}
            tasks={receivedTasks}
            status={TaskStatus.RECEIVED}
          />
          <TaskColumn
            title={t("tasks.inProcess") || "IN PROCESS"}
            tasks={inProcessTasks}
            status={TaskStatus.IN_PROCESS}
          />
          <TaskColumn
            title={t("tasks.completed") || "COMPLETED"}
            tasks={completedTasks}
            status={TaskStatus.COMPLETED}
          />
        </div>
      )}
    </div>
  );
}
