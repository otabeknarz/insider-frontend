"use client";

import { useState, useEffect } from "react";
import ApiService from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, UserPlus } from "lucide-react";

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  position: string;
  region: string;
  date_joined: string;
}

interface Team {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  owner: string;
  admins: string[];
  members: string[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [userError, setUserError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  const fetchUsers = async (search?: string) => {
    try {
      setLoadingUsers(true);
      const response = await ApiService.getUsers(search);
      
      // Check if response is an array (getAll=true) or an AxiosResponse object (getAll=false)
      if (Array.isArray(response)) {
        setUsers(response);
      } else {
        setUsers(response.data.results);
      }
      
      setUserError("");
    } catch (err) {
      console.error("Error fetching users:", err);
      setUserError("Failed to load users. Please try again later.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTeams = async (search?: string) => {
    try {
      setLoadingTeams(true);
      const response = await ApiService.getTeams(search);
      
      // Check if response is an array (getAll=true) or an AxiosResponse object (getAll=false)
      if (Array.isArray(response)) {
        setTeams(response);
      } else {
        setTeams(response.data.results);
      }
      
      setTeamError("");
    } catch (err) {
      console.error("Error fetching teams:", err);
      setTeamError("Failed to load teams. Please try again later.");
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "teams") {
      fetchTeams();
    }
  }, [activeTab]);

  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(userSearchQuery);
  };

  const handleTeamSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeams(teamSearchQuery);
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Directory</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span>Teams</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <form onSubmit={handleUserSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search users..."
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
              No users found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-semibold">
                          {user.first_name[0]}
                          {user.last_name[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {user.first_name} {user.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Position:</span>
                          <span className="text-sm font-medium">{user.position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Region:</span>
                          <span className="text-sm font-medium">{user.region}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Joined:</span>
                          <span className="text-sm font-medium">
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

        <TabsContent value="teams">
          <form onSubmit={handleTeamSearch} className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search teams..."
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
              className="pl-10"
            />
          </form>

          {loadingTeams ? (
            <div className="flex justify-center my-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : teamError ? (
            <div className="text-center text-red-500 my-8">{teamError}</div>
          ) : teams.length === 0 ? (
            <div className="text-center text-muted-foreground my-8">
              No teams found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-semibold">
                          {team.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{team.name}</h3>
                          {team.description && (
                            <p className="text-sm text-muted-foreground">
                              {team.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Owner:</span>
                          <span className="text-sm font-medium">{team.owner}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Members:</span>
                          <span className="text-sm font-medium">{team.members.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Created:</span>
                          <span className="text-sm font-medium">
                            {formatDate(team.created_at)}
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
    </div>
  );
}
