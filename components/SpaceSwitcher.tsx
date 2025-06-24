import React from "react";
import { useCore } from "@/lib/core";
import { useLanguage } from "@/lib/language-provider";
import { Space } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Inbox, User, Users, FolderKanban, ChevronRight } from "lucide-react";

export function SpaceSwitcher() {
	const { spaces, selectedSpace, setSelectedSpace } = useCore();
	const { t } = useLanguage();

	// Group spaces by type
	const allSpace = spaces.find((space) => space.type === "all");
	const individualSpace = spaces.find((space) => space.type === "individual");
	const teamSpaces = spaces.filter((space) => space.type === "team");
	const customSpaces = spaces.filter((space) => space.type === "custom");

	const handleSpaceSelect = (space: Space) => {
		setSelectedSpace(space);
	};

	// Get icon for space type
	const getSpaceIcon = (type: string) => {
		switch (type) {
			case "all":
				return <Inbox className="h-4 w-4 mr-2" />;
			case "individual":
				return <User className="h-4 w-4 mr-2" />;
			case "team":
				return <Users className="h-4 w-4 mr-2" />;
			case "custom":
				return <FolderKanban className="h-4 w-4 mr-2" />;
			default:
				return <Inbox className="h-4 w-4 mr-2" />;
		}
	};

	return (
		<div className="py-2">
			<div className="px-3 py-2">
				<h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
					{t("spaces.title")}
				</h2>
				<div className="space-y-1">
					{/* All Tasks Space */}
					{allSpace && (
						<Button
							variant={
								selectedSpace?.id === allSpace.id ? "secondary" : "ghost"
							}
							className="w-full justify-start"
							onClick={() => handleSpaceSelect(allSpace)}
						>
							{getSpaceIcon("all")}
							{allSpace.name}
						</Button>
					)}

					{/* Individual Tasks Space */}
					{individualSpace && (
						<Button
							variant={
								selectedSpace?.id === individualSpace.id ? "secondary" : "ghost"
							}
							className="w-full justify-start"
							onClick={() => handleSpaceSelect(individualSpace)}
						>
							{getSpaceIcon("individual")}
							{individualSpace.name}
						</Button>
					)}

					{/* Team Spaces */}
					{teamSpaces.length > 0 && (
						<>
							<Separator className="my-2" />
							<h3 className="mb-1 px-4 text-sm font-medium">
								{t("spaces.teams")}
							</h3>
							<ScrollArea className="h-[120px]">
								<div className="space-y-1">
									{teamSpaces.map((space) => (
										<Button
											key={space.id}
											variant={
												selectedSpace?.id === space.id ? "secondary" : "ghost"
											}
											className="w-full justify-start"
											onClick={() => handleSpaceSelect(space)}
										>
											{getSpaceIcon("team")}
											<span className="truncate">{space.name}</span>
											{selectedSpace?.id === space.id && (
												<ChevronRight className="ml-auto h-4 w-4 opacity-50" />
											)}
										</Button>
									))}
								</div>
							</ScrollArea>
						</>
					)}

					{/* Custom Spaces (will be populated from backend later) */}
					{customSpaces.length > 0 && (
						<>
							<Separator className="my-2" />
							<h3 className="mb-1 px-4 text-sm font-medium">
								{t("spaces.custom")}
							</h3>
							<ScrollArea className="h-[120px]">
								<div className="space-y-1">
									{customSpaces.map((space) => (
										<Button
											key={space.id}
											variant={
												selectedSpace?.id === space.id ? "secondary" : "ghost"
											}
											className="w-full justify-start"
											onClick={() => handleSpaceSelect(space)}
										>
											{getSpaceIcon("custom")}
											<span className="truncate">{space.name}</span>
											{selectedSpace?.id === space.id && (
												<ChevronRight className="ml-auto h-4 w-4 opacity-50" />
											)}
										</Button>
									))}
								</div>
							</ScrollArea>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
