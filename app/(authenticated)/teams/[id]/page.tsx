"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User, Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiService from "@/lib/api";
import { useLanguage } from "@/lib/language-provider";

// Team interface
interface TeamMember {
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
  date_joined: string;
}

interface Team {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  owner: TeamMember;
  admins: TeamMember[];
  members: TeamMember[];
}

export default function TeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");

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
        setError("Failed to load team details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTeam();
    }
  }, [id]);

  // Format date to a more readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get user initials for avatar
  const getUserInitials = (firstName?: string, lastName?: string): string => {
    const firstInitial = firstName && firstName.length > 0 ? firstName.charAt(0) : '';
    const lastInitial = lastName && lastName.length > 0 ? lastName.charAt(0) : '';
    
    if (!firstInitial && !lastInitial) {
      return 'U'; // Default for unknown user
    }
    
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/teams")}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t("teams.backToTeams") || "Back to Teams"}
        </Button>
        <h1 className="text-3xl font-bold">
          {loading ? "Loading..." : team?.name}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      ) : team ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>{t("teams.teamInfo") || "Team Info"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("teams.description") || "Description"}
                  </h3>
                  <p className="text-sm">
                    {team.description || t("teams.noDescription")}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("teams.owner") || "Owner"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getUserInitials(
                          team.owner.first_name,
                          team.owner.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {team.owner.first_name} {team.owner.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team.owner.position?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t("teams.created") || "Created"}
                  </h3>
                  <p className="text-sm">{formatDate(team.created_at)}</p>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("teams.members") || "Members"}
                    </h3>
                    <p className="text-sm font-medium">
                      {team.members.length + 1} {/* +1 for owner */}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("teams.admins") || "Admins"}
                    </h3>
                    <p className="text-sm font-medium">
                      {team.admins.length + 1} {/* +1 for owner */}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members */}
          <div className="lg:col-span-2">
            <Tabs
              defaultValue="members"
              className="w-full"
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="w-full mb-6">
                <TabsTrigger value="members" className="flex-1">
                  <Users className="mr-2 h-4 w-4" />
                  {t("teams.members") || "Members"}
                </TabsTrigger>
                <TabsTrigger value="admins" className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("teams.admins") || "Admins"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {t("teams.teamMembers") || "Team Members"}
                      </CardTitle>
                      <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t("teams.addMember") || "Add Member"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Owner */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getUserInitials(
                                team.owner.first_name,
                                team.owner.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {team.owner.first_name} {team.owner.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {team.owner.position?.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {t("teams.owner") || "Owner"}
                        </Badge>
                      </div>

                      {/* Members */}
                      {team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getUserInitials(
                                  member.first_name,
                                  member.last_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {member.first_name} {member.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.position?.name}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {t("teams.member") || "Member"}
                          </Badge>
                        </div>
                      ))}

                      {team.members.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t("teams.noMembers") || "No members yet"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admins">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        {t("teams.teamAdmins") || "Team Admins"}
                      </CardTitle>
                      <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t("teams.addAdmin") || "Add Admin"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Owner */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getUserInitials(
                                team.owner.first_name,
                                team.owner.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {team.owner.first_name} {team.owner.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {team.owner.position?.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {t("teams.owner") || "Owner"}
                        </Badge>
                      </div>

                      {/* Admins */}
                      {team.admins.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {getUserInitials(
                                  admin.first_name,
                                  admin.last_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {admin.first_name} {admin.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {admin.position?.name}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {t("teams.admin") || "Admin"}
                          </Badge>
                        </div>
                      ))}

                      {team.admins.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {t("teams.noAdmins") || "No admins yet"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : null}
    </div>
  );
}
