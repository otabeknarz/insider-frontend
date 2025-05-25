"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Plus, Search, User, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import ApiService from "@/lib/api";
import { useLanguage } from "@/lib/language-provider";
import axios from "axios";

// User interface
interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  position: string | { id: number; name: string };
  region: string | { id: number; name: string };
  district?: { id: number; name: string; region: number };
  date_joined: string;
}

// Team interface
interface Team {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  owner: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    position: {
      id: number;
      name: string;
    };
    region: {
      id: number;
      name: string;
    };
    district?: {
      id: number;
      name: string;
      region: number;
    };
    created_at: string;
    updated_at: string;
    date_joined: string;
  };
  admins: any[];
  members: any[];
}

export default function TeamsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Translation constants
  const translations = {
    teams: {
      title: t("teams.title") || "Teams",
      searchPlaceholder: t("teams.searchPlaceholder") || "Search teams...",
      create: t("teams.create") || "Create Team",
      view: t("teams.view") || "View Team",
      noTeams: t("teams.noTeams") || "No teams found.",
      noDescription: t("teams.noDescription") || "No description available.",
      owner: t("teams.owner") || "Owner",
      position: t("teams.position") || "Position",
      admins: t("teams.admins") || "Admins",
      members: t("teams.members") || "Members",
      created: t("teams.created") || "Created",
      loading: t("teams.loading") || "Loading more teams...",
      createTeam: t("teams.createTeam") || "Create New Team",
      teamName: t("teams.teamName") || "Team Name",
      teamNamePlaceholder: t("teams.teamNamePlaceholder") || "Enter team name",
      teamDescription: t("teams.teamDescription") || "Description",
      teamDescriptionPlaceholder:
        t("teams.teamDescriptionPlaceholder") || "Enter team description",
      creating: t("teams.creating") || "Creating...",
      cancel: t("teams.cancel") || "Cancel",
      createError:
        t("teams.createError") || "Failed to create team. Please try again.",
    },
    users: {
      title: t("users.title") || "Users",
      searchPlaceholder: t("users.searchPlaceholder") || "Search users...",
      noUsers: t("users.noUsers") || "No users found.",
      position: t("users.position") || "Position",
      region: t("users.region") || "Region",
      joined: t("users.joined") || "Joined",
    },
  };

  const [activeTab, setActiveTab] = useState<string>("teams");
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMoreTeams, setLoadingMoreTeams] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [userError, setUserError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [nextTeamsUrl, setNextTeamsUrl] = useState<string | null>(null);
  const [hasMoreTeams, setHasMoreTeams] = useState(true);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Create team state
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);
  const [isCreateTeamDrawerOpen, setIsCreateTeamDrawerOpen] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    name: "",
    description: "",
  });
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState("");

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up event listener
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const fetchUsers = async (search?: string) => {
    try {
      setLoadingUsers(true);
      const response = await ApiService.getUsers(search);

      // Handle different response formats
      if (Array.isArray(response)) {
        setUsers(response);
      } else if (response && response.data && response.data.results) {
        setUsers(response.data.results);
      } else {
        setUsers([]);
      }

      setUserError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setUserError("Failed to load users. Please try again later.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTeams = async (search?: string, reset: boolean = true) => {
    try {
      if (reset) {
        setLoadingTeams(true);
        setTeams([]);
        setNextTeamsUrl(null);
        setHasMoreTeams(true);
      }

      const response = await ApiService.getTeams(search);

      // Handle different response formats
      if (Array.isArray(response)) {
        setTeams(response);
        setNextTeamsUrl(null);
        setHasMoreTeams(false);
      } else if (response && response.data) {
        if (reset) {
          setTeams(response.data.results || []);
        } else {
          setTeams((prev) => [...prev, ...(response.data.results || [])]);
        }

        // Check if there's a next page
        setNextTeamsUrl(response.data.next);
        setHasMoreTeams(!!response.data.next);
      } else {
        setTeams([]);
        setNextTeamsUrl(null);
        setHasMoreTeams(false);
      }

      setTeamError("");
    } catch (err) {
      console.error("Error fetching teams:", err);
      setTeamError("Failed to load teams. Please try again later.");
    } finally {
      setLoadingTeams(false);
    }
  };

  // Function to load more teams when scrolling - memoized to prevent infinite loops
  const loadMoreTeams = useCallback(async () => {
    if (!nextTeamsUrl || loadingMoreTeams || !hasMoreTeams) return;

    try {
      setLoadingMoreTeams(true);

      // Make direct axios request to the next URL
      const response = await axios.get(nextTeamsUrl);

      if (response.data && response.data.results) {
        // Append new results to existing teams
        setTeams((prev) => [...prev, ...response.data.results]);

        // Update next URL for future pagination
        setNextTeamsUrl(response.data.next);
        setHasMoreTeams(!!response.data.next);
      }
    } catch (err) {
      console.error("Error loading more teams:", err);
    } finally {
      setLoadingMoreTeams(false);
    }
  }, [nextTeamsUrl, loadingMoreTeams, hasMoreTeams]);

  // Set up intersection observer for infinite scrolling
  const setupIntersectionObserver = useCallback(() => {
    // Disconnect previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create a new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // If the load more element is visible and we're on the teams tab
        if (
          entries[0].isIntersecting &&
          activeTab === "teams" &&
          hasMoreTeams &&
          !loadingMoreTeams
        ) {
          loadMoreTeams();
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    // Observe the load more element if it exists
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [activeTab, hasMoreTeams, loadingMoreTeams]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "teams") {
      fetchTeams();
    }

    // Setup the intersection observer after data is loaded
    setTimeout(() => {
      setupIntersectionObserver();
    }, 500);

    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeTab, setupIntersectionObserver]);

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(userSearchQuery);
  };

  const handleTeamSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure we're passing the search query to the API
    if (teamSearchQuery.trim()) {
      fetchTeams(teamSearchQuery.trim(), true);
    } else {
      fetchTeams(undefined, true);
    }

    // Reset scroll position after search
    window.scrollTo(0, 0);
  };

  // Handle team form input changes
  const handleTeamFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTeamFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Create a new team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamFormData.name.trim()) {
      setCreateTeamError("Team name is required");
      return;
    }

    try {
      setCreatingTeam(true);
      setCreateTeamError("");

      // Make API request to create team
      const response = await ApiService.createTeam({
        name: teamFormData.name.trim(),
        description: teamFormData.description.trim(),
      });

      // Reset form
      setTeamFormData({
        name: "",
        description: "",
      });

      // Close dialog/drawer based on device type
      if (isMobile) {
        setIsCreateTeamDrawerOpen(false);
      } else {
        setIsCreateTeamDialogOpen(false);
      }

      // Redirect to the new team's page
      router.push(`/teams/${response.data.id}`);
    } catch (err) {
      console.error("Error creating team:", err);
      setCreateTeamError(translations.teams.createError);
    } finally {
      setCreatingTeam(false);
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Not available";
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Not available";
    }
  };

  // Get position name regardless of whether it's a string or object
  const getPositionName = (position: string | { id: number; name: string }) => {
    if (typeof position === "string") return position;
    return position?.name || "";
  };

  // Get region name regardless of whether it's a string or object
  const getRegionName = (region: string | { id: number; name: string }) => {
    if (typeof region === "string") return region;
    return region?.name || "";
  };

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="teams" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
            <h1 className="text-2xl font-bold">
              {activeTab === "teams"
                ? translations.teams.title
                : translations.users.title}
            </h1>
          </div>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger
              value="teams"
              className="flex items-center gap-1 flex-1"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t("teams.teams")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center gap-1 flex-1"
            >
              <User className="h-4 w-4" />
              <span>{t("teams.users")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="teams" className="mt-0">
          <div className="flex justify-between items-end gap-4 mb-6 flex-col sm:flex-row">
            <form
              onSubmit={handleTeamSearch}
              className="w-full relative flex-1"
            >
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder={translations.teams.searchPlaceholder}
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="pl-10"
              />
            </form>
            <Button
              onClick={() => {
                if (isMobile) {
                  setIsCreateTeamDrawerOpen(true);
                } else {
                  setIsCreateTeamDialogOpen(true);
                }
                // Reset form data and errors when opening
                setTeamFormData({ name: "", description: "" });
                setCreateTeamError("");
              }}
              className="flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>{translations.teams.create}</span>
            </Button>
          </div>

          {loadingTeams ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : teamError ? (
            <div className="text-center text-red-500 my-8">{teamError}</div>
          ) : teams.length === 0 ? (
            <div className="text-center text-muted-foreground my-8">
              {translations.teams.noTeams}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {team.description || translations.teams.noDescription}
                    </p>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">
                        {translations.teams.owner}:
                      </span>
                      <span className="font-medium">
                        {team.owner
                          ? `${team.owner.first_name} ${team.owner.last_name}`
                          : ""}
                      </span>
                    </div>
                    {team.owner && team.owner.position && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-muted-foreground">
                          {translations.teams.position}:
                        </span>
                        <span className="font-medium">
                          {team.owner.position.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">
                        {translations.teams.admins}:
                      </span>
                      <span className="font-medium">{team.admins.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-muted-foreground">
                        {translations.teams.members}:
                      </span>
                      <span className="font-medium">{team.members.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-muted-foreground">
                        {translations.teams.created}:
                      </span>
                      <span className="font-medium">
                        {formatDate(team.created_at)}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1 w-full"
                      onClick={() => router.push(`/teams/${team.id}`)}
                    >
                      <UserPlus className="h-3 w-3" />
                      <span>{translations.teams.view}</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Load more indicator - this element will be observed for intersection */}
              {hasMoreTeams && (
                <div
                  ref={loadMoreRef}
                  className="col-span-full flex justify-center py-4"
                >
                  {loadingMoreTeams ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{translations.teams.loading}</span>
                    </div>
                  ) : (
                    <div className="h-8"></div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <form onSubmit={handleUserSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder={translations.users.searchPlaceholder}
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-10"
            />
          </form>

          {loadingUsers ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : userError ? (
            <div className="text-center text-red-500 my-8">{userError}</div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground my-8">
              {translations.users.noUsers}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-semibold flex-shrink-0">
                          {user.first_name?.[0] || ""}
                          {user.last_name?.[0] || ""}
                        </div>
                        <div className="min-w-0">
                          {" "}
                          {/* This prevents text overflow */}
                          <h3 className="font-semibold text-lg truncate">
                            {user.first_name} {user.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {translations.users.position}:
                          </span>
                          <span className="text-sm font-medium truncate ml-2 text-right max-w-[60%]">
                            {getPositionName(user.position)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {translations.users.region}:
                          </span>
                          <span className="text-sm font-medium truncate ml-2 text-right max-w-[60%]">
                            {getRegionName(user.region)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {translations.users.joined}:
                          </span>
                          <span className="text-sm font-medium text-right">
                            {formatDate(user.date_joined)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog for Desktop */}
      <Dialog
        open={isCreateTeamDialogOpen}
        onOpenChange={setIsCreateTeamDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{translations.teams.createTeam}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTeam} className="space-y-4 py-4">
            {createTeamError && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                {createTeamError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="team-name-dialog">
                {translations.teams.teamName}
              </Label>
              <Input
                id="team-name-dialog"
                name="name"
                value={teamFormData.name}
                onChange={handleTeamFormChange}
                placeholder={translations.teams.teamNamePlaceholder}
                disabled={creatingTeam}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description-dialog">
                {translations.teams.teamDescription}
              </Label>
              <Textarea
                id="team-description-dialog"
                name="description"
                value={teamFormData.description}
                onChange={handleTeamFormChange}
                placeholder={translations.teams.teamDescriptionPlaceholder}
                disabled={creatingTeam}
                rows={4}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={creatingTeam}
                onClick={() => setIsCreateTeamDialogOpen(false)}
              >
                {translations.teams.cancel}
              </Button>
              <Button type="submit" disabled={creatingTeam}>
                {creatingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translations.teams.creating}
                  </>
                ) : (
                  translations.teams.create
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team Drawer for Mobile */}
      <Drawer
        open={isCreateTeamDrawerOpen}
        onOpenChange={setIsCreateTeamDrawerOpen}
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{translations.teams.createTeam}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4">
            <form onSubmit={handleCreateTeam} className="space-y-4 py-4">
              {createTeamError && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                  {createTeamError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team-name-drawer">
                  {translations.teams.teamName}
                </Label>
                <Input
                  id="team-name-drawer"
                  name="name"
                  value={teamFormData.name}
                  onChange={handleTeamFormChange}
                  placeholder={translations.teams.teamNamePlaceholder}
                  disabled={creatingTeam}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description-drawer">
                  {translations.teams.teamDescription}
                </Label>
                <Textarea
                  id="team-description-drawer"
                  name="description"
                  value={teamFormData.description}
                  onChange={handleTeamFormChange}
                  placeholder={translations.teams.teamDescriptionPlaceholder}
                  disabled={creatingTeam}
                  rows={4}
                />
              </div>

              <DrawerFooter className="px-0 pt-2">
                <Button
                  type="submit"
                  disabled={creatingTeam}
                  className="w-full"
                >
                  {creatingTeam ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {translations.teams.creating}
                    </>
                  ) : (
                    translations.teams.create
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={creatingTeam}
                    className="w-full"
                  >
                    {translations.teams.cancel}
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
