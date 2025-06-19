"use client";

import * as React from "react";
import { ChevronDown, Plus, User, Users } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

// Define our view types including Personal and All
type ViewType = "personal" | "all" | "team";

interface TeamSwitcherProps {
	teams: {
		name: string;
		logo: React.ElementType;
		plan: string;
	}[];
}

export function TeamSwitcher({ teams }: TeamSwitcherProps) {
	// Add Personal and All as special options
	const [activeView, setActiveView] = React.useState<{
		type: ViewType;
		name: string;
		logo: React.ElementType;
		plan?: string;
	}>({ type: "personal", name: "Personal", logo: User });

	if (!activeView) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton className="w-fit px-1.5">
							<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
								<activeView.logo className="size-3" />
							</div>
							<span className="truncate font-medium">{activeView.name}</span>
							<ChevronDown className="opacity-50" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-64 rounded-lg"
						align="start"
						side="bottom"
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Views
						</DropdownMenuLabel>
						{/* Personal option */}
						<DropdownMenuItem
							key="personal"
							onClick={() =>
								setActiveView({
									type: "personal",
									name: "Personal",
									logo: User,
								})
							}
							className="gap-2 p-2"
						>
							<div className="flex size-6 items-center justify-center rounded-xs border">
								<User className="size-4 shrink-0" />
							</div>
							Personal
							<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
						</DropdownMenuItem>

						{/* All option */}
						<DropdownMenuItem
							key="all"
							onClick={() =>
								setActiveView({ type: "all", name: "All", logo: Users })
							}
							className="gap-2 p-2"
						>
							<div className="flex size-6 items-center justify-center rounded-xs border">
								<Users className="size-4 shrink-0" />
							</div>
							All
							<DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Teams
						</DropdownMenuLabel>
						{teams.map((team, index) => (
							<DropdownMenuItem
								key={team.name}
								onClick={() => setActiveView({ type: "team", ...team })}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-xs border">
									<team.logo className="size-4 shrink-0" />
								</div>
								{team.name}
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2">
							<div className="bg-background flex size-6 items-center justify-center rounded-md border">
								<Plus className="size-4" />
							</div>
							<div className="text-muted-foreground font-medium">Add team</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
