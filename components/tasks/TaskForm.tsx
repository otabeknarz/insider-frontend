import React from "react";
import { useLanguage } from "@/lib/language-provider";
import { Task, Team, User, TaskPriorityBackend, TaskFormData } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { UserMultiSelect } from "./UserMultiSelect";

interface TaskFormProps {
	formData: TaskFormData;
	setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
	handleChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => void;
	teams: Team[];
	users: User[];
	loadingTeams: boolean;
	loadingUsers: boolean;
	teamSearch: string;
	userSearch: string;
	setTeamSearch: React.Dispatch<React.SetStateAction<string>>;
	setUserSearch: React.Dispatch<React.SetStateAction<string>>;
	selectedTeam: Team | null;
	formId: string;
	prefix: string;
}

export function TaskForm({
	formData,
	setFormData,
	handleChange,
	teams,
	users,
	loadingTeams,
	loadingUsers,
	teamSearch,
	userSearch,
	setTeamSearch,
	setUserSearch,
	selectedTeam,
	formId,
	prefix,
}: TaskFormProps) {
	const { t } = useLanguage();

	// Get proper translations with fallbacks
	const nameLabel = t("tasks.name") === "tasks.name" ? "Name" : t("tasks.name");
	const teamLabel = t("tasks.team") === "tasks.team" ? "Team" : t("tasks.team");
	const assignedUsersLabel =
		t("tasks.assignedUsers") === "tasks.assignedUsers"
			? "Assigned Users"
			: t("tasks.assignedUsers");
	const descriptionLabel =
		t("tasks.description") === "tasks.description"
			? "Description"
			: t("tasks.description");
	const priorityLabel =
		t("tasks.priority") === "tasks.priority" ? "Priority" : t("tasks.priority");
	const deadlineLabel =
		t("tasks.deadline") === "tasks.deadline" ? "Deadline" : t("tasks.deadline");

	// Placeholders
	const namePlaceholder =
		t("tasks.namePlaceholder") === "tasks.namePlaceholder"
			? "Enter task name"
			: t("tasks.namePlaceholder");
	const descriptionPlaceholder =
		t("tasks.descriptionPlaceholder") === "tasks.descriptionPlaceholder"
			? "Enter task description"
			: t("tasks.descriptionPlaceholder");
	const selectTeamPlaceholder =
		t("tasks.selectTeam") === "tasks.selectTeam"
			? "Select a team"
			: t("tasks.selectTeam");
	const noTeamOption =
		t("tasks.noTeam") === "tasks.noTeam" ? "No team" : t("tasks.noTeam");
	const teamMembersOnlyMessage =
		t("tasks.teamMembersOnly") === "tasks.teamMembersOnly"
			? "Only team members will be assigned to this task"
			: t("tasks.teamMembersOnly");
	const selectAssignedUsersPlaceholder =
		t("tasks.selectAssignedUsers") === "tasks.selectAssignedUsers"
			? "Select users to assign"
			: t("tasks.selectAssignedUsers");
	const searchUsersPlaceholder =
		t("users.searchPlaceholder") === "users.searchPlaceholder"
			? "Search users"
			: t("users.searchPlaceholder");
	const searchTeamsPlaceholder =
		t("teams.searchPlaceholder") === "teams.searchPlaceholder"
			? "Search teams"
			: t("teams.searchPlaceholder");
	const selectPriorityPlaceholder =
		t("tasks.selectPriority") === "tasks.selectPriority"
			? "Select priority"
			: t("tasks.selectPriority");
	const priorityDefaultLabel =
		t("tasks.priorityDefault") === "tasks.priorityDefault"
			? "Medium (Default)"
			: t("tasks.priorityDefault");
	const priorityHighLabel =
		t("tasks.priorityHigh") === "tasks.priorityHigh"
			? "High"
			: t("tasks.priorityHigh");

	const filteredTeams = teams.filter((team) =>
		team.name.toLowerCase().includes(teamSearch.toLowerCase())
	);

	return (
		<form
			id={formId}
			onSubmit={(e) => e.preventDefault()}
			className="space-y-4"
		>
			<div className="space-y-4">
				{/* Task Name */}
				<div className="space-y-2">
					<label
						htmlFor={`name-${prefix}`}
						className="block text-sm font-medium"
					>
						{nameLabel}
					</label>
					<Input
						id={`name-${prefix}`}
						name="name"
						value={formData.name}
						onChange={handleChange}
						placeholder={namePlaceholder}
					/>
				</div>

				{/* Task Description */}
				<div className="space-y-2">
					<label
						htmlFor={`description-${prefix}`}
						className="block text-sm font-medium"
					>
						{descriptionLabel}
					</label>
					<Textarea
						id={`description-${prefix}`}
						name="description"
						value={formData.description}
						onChange={handleChange}
						placeholder={descriptionPlaceholder}
						className="h-32 resize-none"
					/>
				</div>

				{/* Team Selection */}
				<div className="space-y-2">
					<label
						htmlFor={`team-${prefix}`}
						className="block text-sm font-medium"
					>
						{teamLabel}
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
						<SelectTrigger id={`team-${prefix}`}>
							<SelectValue placeholder={selectTeamPlaceholder} />
						</SelectTrigger>
						<SelectContent>
							<div className="p-2">
								<Input
									type="text"
									placeholder={searchTeamsPlaceholder}
									value={teamSearch}
									onChange={(e) => setTeamSearch(e.target.value)}
									className="text-sm"
								/>
							</div>
							<SelectItem value="none">{noTeamOption}</SelectItem>
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

				{/* Team Info Message */}
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
									{teamMembersOnlyMessage}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Assigned Users */}
				<div className="space-y-2">
					<label
						htmlFor={`assigned-users-${prefix}`}
						className="block text-sm font-medium"
					>
						{assignedUsersLabel}
					</label>
					<UserMultiSelect
						users={users}
						selectedUserIds={Array.isArray(formData.assigned_user) ? formData.assigned_user : formData.assigned_user ? [formData.assigned_user] : []}
						onSelectionChange={(selectedIds) =>
							setFormData((prev) => ({
								...prev,
								assigned_user: selectedIds,
							}))
						}
						placeholderText={selectAssignedUsersPlaceholder}
						searchPlaceholder={searchUsersPlaceholder}
						id={`assigned-users-${prefix}`}
						userSearch={userSearch}
						onUserSearchChange={setUserSearch}
						loadingUsers={loadingUsers}
					/>
				</div>

				{/* Priority */}
				<div className="space-y-2">
					<label
						htmlFor={`priority-${prefix}`}
						className="block text-sm font-medium"
					>
						{priorityLabel}
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
						<SelectTrigger id={`priority-${prefix}`}>
							<SelectValue placeholder={selectPriorityPlaceholder} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={TaskPriorityBackend.MEDIUM.toString()}>
								{priorityDefaultLabel}
							</SelectItem>
							<SelectItem value={TaskPriorityBackend.HIGH.toString()}>
								{priorityHighLabel}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Deadline */}
				<div className="space-y-2">
					<label
						htmlFor={`deadline-${prefix}`}
						className="block text-sm font-medium"
					>
						{deadlineLabel}
					</label>
					<Input
						id={`deadline-${prefix}`}
						name="deadline"
						type="datetime-local"
						value={formData.deadline || ""}
						onChange={handleChange}
					/>
				</div>
			</div>
		</form>
	);
}
