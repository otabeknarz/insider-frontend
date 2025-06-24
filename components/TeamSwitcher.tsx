import React, { useState } from "react";
import {
	Check,
	ChevronsUpDown,
	PlusCircle,
	Inbox,
	User,
	Users,
	FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useCore } from "@/lib/core";
import { Space, Team } from "@/lib/types";
import { useLanguage } from "@/lib/language-provider";
import { useRouter } from "next/navigation";

export function TeamSwitcher() {
	const { t } = useLanguage();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const {
		teams,
		selectedTeam,
		setSelectedTeam,
		spaces,
		selectedSpace,
		setSelectedSpace,
		refreshTeams,
	} = useCore();

	// Debug logging
	React.useEffect(() => {
		console.log("TeamSwitcher state:", {
			teamsCount: teams.length,
			spacesCount: spaces.length,
			selectedTeam,
			selectedSpace,
		});
		
		// If we don't have spaces but have teams, try refreshing teams
		if (teams.length > 0 && spaces.length === 0) {
			console.log("Have teams but no spaces, refreshing teams");
			refreshTeams();
		}
	}, [teams, spaces, selectedTeam, selectedSpace, refreshTeams]);

	// Group spaces by type
	const allSpace = spaces.find((space) => space.type === "all");
	const individualSpace = spaces.find((space) => space.type === "individual");
	const teamSpaces = spaces.filter((space) => space.type === "team");
	const customSpaces = spaces.filter((space) => space.type === "custom");
	
	// If no spaces are available, show a minimal UI instead of nothing
	if (!spaces.length) {
		return (
			<Button
				variant="outline"
				className="w-full justify-between text-left font-normal"
				onClick={() => refreshTeams()}
			>
				{t("spaces.loading") || "Loading spaces..."}
				<ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
			</Button>
		);
	}

	const handleSpaceSelect = (space: Space) => {
		try {
			console.log("Selecting space:", space);
			
			// Store the space ID in localStorage for persistence
			localStorage.setItem("selectedSpaceId", space.id);
			
			// Update the selected space in CoreContext
			setSelectedSpace(space);
			
			// If selecting a team space, also select the corresponding team
			if (space.type === "team" && space.teamId) {
				const team = teams.find((t) => t.id === space.teamId);
				if (team) {
					console.log("Also selecting team:", team);
					setSelectedTeam(team);
					localStorage.setItem("selectedTeamId", team.id.toString());
				} else {
					console.warn("Team not found for space:", space);
				}
			}
			
			setError(null);
		} catch (err) {
			console.error("Error selecting space:", err);
			setError("Failed to select space");
		} finally {
			setOpen(false);
		}
	};

	const handleCreateTeam = () => {
		router.push("/teams/new");
		setOpen(false);
	};

	// Get icon for space type
	const getSpaceIcon = (type: string) => {
		switch (type) {
			case "all":
				return <Inbox className="mr-2 h-4 w-4" />;
			case "individual":
				return <User className="mr-2 h-4 w-4" />;
			case "team":
				return <Users className="mr-2 h-4 w-4" />;
			case "custom":
				return <FolderKanban className="mr-2 h-4 w-4" />;
			default:
				return <Inbox className="mr-2 h-4 w-4" />;
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label={t("spaces.select_space") || "Select space or team"}
					className="w-full justify-between text-left font-normal"
				>
					{selectedSpace?.name ||
						selectedTeam?.name ||
						t("spaces.select_space") ||
						"Select space or team"}
					<ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[250px] p-0">
				<Command>
					<CommandInput
						placeholder={t("spaces.search_space") || "Search space or team..."}
					/>
					<CommandList>
						<CommandEmpty>
							{t("spaces.no_spaces_found") || "No spaces or teams found"}
						</CommandEmpty>

						{/* Default Spaces */}
						<CommandGroup heading={t("spaces.default") || "Default Spaces"}>
							{allSpace && (
								<CommandItem
									key={allSpace.id}
									onSelect={() => handleSpaceSelect(allSpace)}
									className="text-sm"
								>
									{getSpaceIcon("all")}
									{allSpace.name}
									<Check
										className={cn(
											"ml-auto h-4 w-4",
											selectedSpace?.id === allSpace.id
												? "opacity-100"
												: "opacity-0"
										)}
									/>
								</CommandItem>
							)}
							{individualSpace && (
								<CommandItem
									key={individualSpace.id}
									onSelect={() => handleSpaceSelect(individualSpace)}
									className="text-sm"
								>
									{getSpaceIcon("individual")}
									{individualSpace.name}
									<Check
										className={cn(
											"ml-auto h-4 w-4",
											selectedSpace?.id === individualSpace.id
												? "opacity-100"
												: "opacity-0"
										)}
									/>
								</CommandItem>
							)}
						</CommandGroup>

						{/* Team Spaces */}
						{teamSpaces.length > 0 && (
							<CommandGroup heading={t("spaces.teams") || "Team Spaces"}>
								{teamSpaces.map((space) => (
									<CommandItem
										key={space.id}
										onSelect={() => handleSpaceSelect(space)}
										className="text-sm"
									>
										{getSpaceIcon("team")}
										{space.name}
										<Check
											className={cn(
												"ml-auto h-4 w-4",
												selectedSpace?.id === space.id
													? "opacity-100"
													: "opacity-0"
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}

						{/* Custom Spaces */}
						{customSpaces.length > 0 && (
							<CommandGroup heading={t("spaces.custom") || "Custom Spaces"}>
								{customSpaces.map((space) => (
									<CommandItem
										key={space.id}
										onSelect={() => handleSpaceSelect(space)}
										className="text-sm"
									>
										{getSpaceIcon("custom")}
										{space.name}
										<Check
											className={cn(
												"ml-auto h-4 w-4",
												selectedSpace?.id === space.id
													? "opacity-100"
													: "opacity-0"
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}

						<CommandSeparator />

						<CommandGroup>
							<CommandItem onSelect={handleCreateTeam}>
								<PlusCircle className="mr-2 h-4 w-4" />
								{t("teams.create_team") || "Create Team"}
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
