"use client";

import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	useMemo,
} from "react";
import ApiService from "./api";
import { useAuth } from "./auth";
import { CoreContextType, Space, SpaceType, Task, Team, User } from "./types";

// Generate a unique ID for spaces
const generateId = () => `space_${Math.random().toString(36).substr(2, 9)}`;

const CoreContext = createContext<CoreContextType | undefined>(undefined);

export const CoreProvider = ({ children }: { children: ReactNode }) => {
	// State for teams
	const [teams, setTeams] = useState<Team[]>([]);
	const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

	// State for tasks
	const [tasks, setTasks] = useState<Task[]>([]);

	// State for users
	const [users, setUsers] = useState<User[]>([]);

	// State for spaces
	const [spaces, setSpaces] = useState<Space[]>([]);
	const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

	// Loading and error states
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { user } = useAuth();

	// Fetch teams for the current user
	const fetchUserTeams = async () => {
		if (!user?.id) return;

		setLoading(true);
		try {
			// Fetch teams where the current user is a member
			const response = await ApiService.request<{ results: Team[] }>({
				method: "get",
				url: `/api/core/teams/?members=${user.id}&admins=${user.id}&created_by=${user.id}`,
			});

			const userTeams = response.data.results || [];
			setTeams(userTeams);

			// Set the selected team from localStorage or use the first team
			const savedTeamId = localStorage.getItem("selectedTeamId");
			if (
				savedTeamId &&
				userTeams.some((team: Team) => team.id.toString() === savedTeamId)
			) {
				const team = userTeams.find(
					(team: Team) => team.id.toString() === savedTeamId
				);
				setSelectedTeam(team || null);
			} else if (userTeams.length > 0) {
				setSelectedTeam(userTeams[0]);
				localStorage.setItem("selectedTeamId", userTeams[0].id.toString());
			}

			setError(null);
		} catch (err) {
			console.error("Error fetching user teams:", err);
			setError("Failed to load teams");
		} finally {
			setLoading(false);
		}
	};

	// Fetch all tasks
	const fetchTasks = async () => {
		if (!user?.id) return;

		setLoading(true);
		try {
			const response = await ApiService.request<{ results: Task[] }>({
				method: "get",
				url: "/api/core/tasks/",
			});

			const fetchedTasks = response.data.results || [];
			setTasks(fetchedTasks);
			setError(null);
		} catch (err) {
			console.error("Error fetching tasks:", err);
			setError("Failed to load tasks");
		} finally {
			setLoading(false);
		}
	};

	// Fetch all users
	const fetchUsers = async () => {
		if (!user?.id) return;

		setLoading(true);
		try {
			const response = await ApiService.request<{ results: User[] }>({
				method: "get",
				url: "/api/auth/users/",
			});

			const fetchedUsers = response.data.results || [];
			setUsers(fetchedUsers);
			setError(null);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError("Failed to load users");
		} finally {
			setLoading(false);
		}
	};

	// Handle team selection
	const handleSetSelectedTeam = (team: Team | null) => {
		setSelectedTeam(team);
		if (team) {
			localStorage.setItem("selectedTeamId", team.id.toString());

			// If a team is selected, also select its corresponding space
			const teamSpace = spaces.find(
				(space) => space.type === "team" && space.teamId === team.id
			);
			if (teamSpace) {
				handleSetSelectedSpace(teamSpace);
			}
		} else {
			localStorage.removeItem("selectedTeamId");
		}
	};

	// Handle space selection
	const handleSetSelectedSpace = (space: Space) => {
		setSelectedSpace(space);
		localStorage.setItem("selectedSpaceId", space.id);

		// If selecting a team space, also update the selected team
		if (space.type === "team" && space.teamId) {
			const team = teams.find((t) => t.id === space.teamId);
			if (team) {
				setSelectedTeam(team);
				localStorage.setItem("selectedTeamId", team.id.toString());
			}
		}
	};

	// Get tasks for a specific space
	const getTasksBySpace = (spaceId: string) => {
		const space = spaces.find((s) => s.id === spaceId);
		if (!space) return [];

		switch (space.type) {
			case "all":
				return tasks;
			case "individual":
				return tasks.filter((task) => task.team === null);
			case "team":
				return tasks.filter((task) => task.team === space.teamId);
			case "custom":
				// For custom spaces, we would need backend logic to determine which tasks belong to it
				// For now, return an empty array
				return [];
			default:
				return [];
		}
	};

	// Add a new task using bulk endpoint
	const addTask = async (task: Partial<Task>): Promise<Task | null> => {
		try {
			// Check if we have assigned_user as an array for bulk creation
			const isBulkCreation =
				Array.isArray(task.assigned_user) && task.assigned_user.length > 0;
			const url = isBulkCreation ? "/api/core/tasks/bulk/" : "/api/core/tasks/";

			console.log(isBulkCreation);
			console.log(task);

			const response = await ApiService.request<Task | Task[]>({
				method: "post",
				url,
				data: task,
			});

			// Handle response which could be a single task or an array of tasks
			if (Array.isArray(response.data)) {
				// For bulk creation, add all created tasks to state
				const newTasks = response.data;
				setTasks((prev) => [...prev, ...newTasks]);
				// Return the first task as a representative
				return newTasks[0] || null;
			} else {
				// For single task creation
				const newTask = response.data;
				setTasks((prev) => [...prev, newTask]);
				return newTask;
			}
		} catch (err) {
			console.error("Error adding task:", err);
			setError("Failed to add task");
			return null;
		}
	};

	// Update an existing task
	const updateTask = async (
		taskId: number,
		updates: Partial<Task>
	): Promise<Task | null> => {
		try {
			const response = await ApiService.request<Task>({
				method: "patch",
				url: `/api/core/tasks/${taskId}/`,
				data: updates,
			});

			const updatedTask = response.data;
			setTasks((prev) =>
				prev.map((task) => (task.id === taskId ? updatedTask : task))
			);
			return updatedTask;
		} catch (err) {
			console.error("Error updating task:", err);
			setError("Failed to update task");
			return null;
		}
	};

	// Delete a task
	const deleteTask = async (taskId: number): Promise<boolean> => {
		try {
			await ApiService.request({
				method: "delete",
				url: `/api/core/tasks/${taskId}/`,
			});

			setTasks((prev) => prev.filter((task) => task.id !== taskId));
			return true;
		} catch (err) {
			console.error("Error deleting task:", err);
			setError("Failed to delete task");
			return false;
		}
	};

	// Initialize spaces based on teams
	const initializeSpaces = () => {
		console.log("Initializing spaces with teams:", teams);

		const newSpaces: Space[] = [
			// All tasks space
			{
				id: "all",
				name: "All Tasks",
				type: "all",
			},
			// Individual tasks space
			{
				id: "individual",
				name: "Individual Tasks",
				type: "individual",
			},
		];

		// Add team spaces
		if (teams && teams.length > 0) {
			teams.forEach((team) => {
				if (team && team.id) {
					newSpaces.push({
						id: `team_${team.id}`,
						name: team.name || `Team ${team.id}`,
						type: "team",
						teamId: team.id,
					});
				}
			});
		}

		console.log("Created spaces:", newSpaces);
		setSpaces(newSpaces);

		// Set selected space from localStorage or default to 'all'
		const savedSpaceId = localStorage.getItem("selectedSpaceId");
		if (savedSpaceId && newSpaces.some((space) => space.id === savedSpaceId)) {
			const space = newSpaces.find((space) => space.id === savedSpaceId);
			if (space) {
				console.log("Setting selected space from localStorage:", space);
				setSelectedSpace(space);
			}
		} else {
			// Default to 'all' space
			const allSpace = newSpaces.find((space) => space.id === "all");
			if (allSpace) {
				console.log("Setting default 'all' space:", allSpace);
				setSelectedSpace(allSpace);
				localStorage.setItem("selectedSpaceId", allSpace.id);
			}
		}
	};

	// Fetch data when user changes
	useEffect(() => {
		if (user?.id) {
			fetchUserTeams();
			fetchTasks();
			fetchUsers();
		}
	}, [user?.id]);

	// Initialize spaces when teams are loaded or on component mount
	useEffect(() => {
		// Always initialize spaces, even if teams array is empty
		initializeSpaces();
	}, [teams]);

	// Make sure we always have a selected space
	useEffect(() => {
		if (!selectedSpace && spaces.length > 0) {
			const allSpace = spaces.find((space) => space.id === "all");
			if (allSpace) {
				console.log("Ensuring selected space is set:", allSpace);
				setSelectedSpace(allSpace);
			}
		}
	}, [selectedSpace, spaces]);

	return (
		<CoreContext.Provider
			value={{
				// Teams
				teams,
				selectedTeam,
				setSelectedTeam: handleSetSelectedTeam,
				refreshTeams: fetchUserTeams,

				// Tasks
				tasks,
				refreshTasks: fetchTasks,
				getTasksBySpace,
				addTask,
				updateTask,
				deleteTask,

				// Users
				users,
				refreshUsers: fetchUsers,

				// Spaces
				spaces,
				selectedSpace,
				setSelectedSpace: handleSetSelectedSpace,

				// Status
				loading,
				error,
			}}
		>
			{children}
		</CoreContext.Provider>
	);
};

export const useCore = () => {
	const context = useContext(CoreContext);
	if (context === undefined) {
		throw new Error("useCore must be used within a CoreProvider");
	}
	return context;
};
