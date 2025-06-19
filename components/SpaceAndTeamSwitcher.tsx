import React, { useState } from "react";
import { Check, ChevronsUpDown, PlusCircle, Inbox, User, Users, FolderKanban } from "lucide-react";
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

export function SpaceAndTeamSwitcher() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { 
    spaces, 
    selectedSpace, 
    setSelectedSpace, 
    teams, 
    selectedTeam, 
    setSelectedTeam 
  } = useCore();

  // Group spaces by type
  const allSpace = spaces.find(space => space.type === 'all');
  const individualSpace = spaces.find(space => space.type === 'individual');
  const teamSpaces = spaces.filter(space => space.type === 'team');
  const customSpaces = spaces.filter(space => space.type === 'custom');

  if (!spaces.length) {
    return null;
  }

  const handleSpaceSelect = (space: Space) => {
    setSelectedSpace(space);
    setOpen(false);
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    // If we select a team, also select its corresponding team space if it exists
    const teamSpace = teamSpaces.find(space => space.teamId === team.id);
    if (teamSpace) {
      setSelectedSpace(teamSpace);
    }
    setOpen(false);
  };

  const handleCreateTeam = () => {
    router.push("/teams/new");
    setOpen(false);
  };

  // Get icon for space type
  const getSpaceIcon = (type: string) => {
    switch (type) {
      case 'all':
        return <Inbox className="mr-2 h-4 w-4" />;
      case 'individual':
        return <User className="mr-2 h-4 w-4" />;
      case 'team':
        return <Users className="mr-2 h-4 w-4" />;
      case 'custom':
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
          aria-label={t("spaces.select_space")}
          className="w-full justify-between text-left font-normal"
        >
          {selectedSpace?.name || t("spaces.select_space")}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder={t("spaces.search_space")} />
          <CommandList>
            <CommandEmpty>{t("spaces.no_spaces_found")}</CommandEmpty>
            
            {/* Default Spaces */}
            <CommandGroup heading={t("spaces.default")}>
              {allSpace && (
                <CommandItem
                  key={allSpace.id}
                  onSelect={() => handleSpaceSelect(allSpace)}
                  className="text-sm"
                >
                  {getSpaceIcon('all')}
                  {allSpace.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedSpace?.id === allSpace.id ? "opacity-100" : "opacity-0"
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
                  {getSpaceIcon('individual')}
                  {individualSpace.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedSpace?.id === individualSpace.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              )}
            </CommandGroup>
            
            {/* Team Spaces */}
            {teamSpaces.length > 0 && (
              <CommandGroup heading={t("spaces.teams")}>
                {teamSpaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    onSelect={() => handleSpaceSelect(space)}
                    className="text-sm"
                  >
                    {getSpaceIcon('team')}
                    {space.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedSpace?.id === space.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* Custom Spaces */}
            {customSpaces.length > 0 && (
              <CommandGroup heading={t("spaces.custom")}>
                {customSpaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    onSelect={() => handleSpaceSelect(space)}
                    className="text-sm"
                  >
                    {getSpaceIcon('custom')}
                    {space.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedSpace?.id === space.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            <CommandSeparator />
            
            {/* Teams */}
            {teams.length > 0 && (
              <CommandGroup heading={t("teams.my_teams")}>
                {teams.map((team) => (
                  <CommandItem
                    key={team.id}
                    onSelect={() => handleTeamSelect(team)}
                    className="text-sm"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {team.name}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedTeam?.id === team.id ? "opacity-100" : "opacity-0"
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
                {t("teams.create_team")}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
