"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-provider";
import { useLanguage } from "@/lib/language-provider";
import ApiService from "@/lib/api";
import {
  LogOut,
  Save,
  KeyRound,
  User as UserIcon,
  Shield,
  Lock,
  Calendar,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";

// Import Shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// User profile interface
interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  position?: string | { id: number; name: string };
  region?: string | { id: number; name: string };
  district?: { id: number; name: string; region: number };
  date_joined?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [positionDisplay, setPositionDisplay] = useState("");
  const [regionDisplay, setRegionDisplay] = useState("");
  const [districtDisplay, setDistrictDisplay] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "security">("info");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getUserProfile();
        const profileData = response.data;
        setProfile(profileData);

        // Set form fields
        setFirstName(profileData.first_name || "");
        setLastName(profileData.last_name || "");
        setUsername(profileData.username || "");
        setEmail(profileData.email || "");

        // Handle position which could be a string or an object
        if (profileData.position) {
          if (
            typeof profileData.position === "object" &&
            "name" in profileData.position
          ) {
            setPositionDisplay(profileData.position.name);
          } else {
            setPositionDisplay(String(profileData.position));
          }
        } else {
          setPositionDisplay("");
        }

        // Handle region which could be a string or an object
        if (profileData.region) {
          if (
            typeof profileData.region === "object" &&
            "name" in profileData.region
          ) {
            setRegionDisplay(profileData.region.name);
          } else {
            setRegionDisplay(String(profileData.region));
          }
        } else {
          setRegionDisplay("");
        }

        // Handle district
        if (profileData.district && typeof profileData.district === "object") {
          setDistrictDisplay(profileData.district.name);
        } else {
          setDistrictDisplay("");
        }

        setError("");
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle profile form submission - only update changed fields
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");
    setError("");

    try {
      // Create an object with only the fields that have changed
      const updatedFields: Partial<UserProfile> = {};

      if (firstName !== profile?.first_name)
        updatedFields.first_name = firstName;
      if (lastName !== profile?.last_name) updatedFields.last_name = lastName;
      if (username !== profile?.username) updatedFields.username = username;
      // Position, region, and district are now read-only, so we don't update them

      // Only make the API call if there are changes
      if (Object.keys(updatedFields).length > 0) {
        // Use PATCH for partial updates
        await ApiService.patchUserProfile(updatedFields);
        setSaveMessage("Profile updated successfully");

        // Update the profile data in state
        setProfile((prev) => (prev ? { ...prev, ...updatedFields } : null));
      } else {
        setSaveMessage("No changes to save");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);

      // Clear success message after 3 seconds
      if (!error) {
        setTimeout(() => {
          setSaveMessage("");
        }, 3000);
      }
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    // Validate passwords
    if (!currentPassword) {
      setPasswordError("Current password is required");
      setIsChangingPassword(false);
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setIsChangingPassword(false);
      return;
    }

    try {
      await ApiService.changePassword({
        current_password: currentPassword,
        password: newPassword,
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordSuccess("Password changed successfully");

      // Hide password section after successful change
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error("Password change error:", err);
      if (err?.response?.data?.current_password) {
        setPasswordError("Current password is incorrect");
      } else if (err?.response?.data?.new_password) {
        setPasswordError(
          err.response.data.new_password[0] || "Invalid new password"
        );
      } else {
        setPasswordError(err.response.data.detail);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Use the request method with the logout endpoint
      await ApiService.request({
        method: "post",
        url: "/api/auth/logout/",
      });
      router.push("/login");
    } catch (err) {
      console.error("Error logging out:", err);
      setError("Failed to logout. Please try again.");
    }
  };

  return (
    <div className="container mx-auto py-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 items-center justify-center">
                <AvatarFallback className="w-full h-full scale-150">
                  {profile?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">
                  {firstName && lastName
                    ? `${firstName} ${lastName}`
                    : profile?.username || "Profile"}
                </h1>
                <p className="text-sm">@{profile?.username || "Profile"}</p>
                <p className="text-muted-foreground">{email}</p>
                {profile?.date_joined && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {t("profile.joined") || "Joined"}:{" "}
                      {new Date(profile.date_joined).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Button
                variant={activeTab === "info" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("info")}
                className="gap-1.5"
              >
                <UserIcon className="h-4 w-4" />
                {t("profile.personal_info") || "Personal Info"}
              </Button>
              <Button
                variant={activeTab === "security" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("security")}
                className="gap-1.5"
              >
                <Shield className="h-4 w-4" />
                {t("profile.security") || "Security"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "info" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Profile Information */}
              <div className="md:col-span-2">
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-primary" />
                      <CardTitle>
                        {t("profile.personal_info") || "Personal Information"}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {t("profile.personal_info_description") ||
                        "Update your personal details"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="firstName"
                            className="block text-sm font-medium"
                          >
                            {t("profile.first_name") || "First Name"}
                          </label>
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder={
                              t("profile.first_name_placeholder") ||
                              "Enter your first name"
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="lastName"
                            className="block text-sm font-medium"
                          >
                            {t("profile.last_name") || "Last Name"}
                          </label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder={
                              t("profile.last_name_placeholder") ||
                              "Enter your last name"
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="username"
                          className="block text-sm font-medium"
                        >
                          {t("profile.username") || "Username"}
                        </label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={
                            t("profile.username_placeholder") || "Your username"
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="position"
                          className="block text-sm font-medium"
                        >
                          {t("profile.position") || "Position"}
                        </label>
                        <Input
                          id="position"
                          value={positionDisplay}
                          readOnly
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder={
                            t("profile.position_placeholder") ||
                            "Your position or title"
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="region"
                          className="block text-sm font-medium"
                        >
                          {t("profile.region") || "Region"}
                        </label>
                        <Input
                          id="region"
                          value={regionDisplay}
                          readOnly
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder={
                            t("profile.region_placeholder") || "Your region"
                          }
                        />
                      </div>

                      {/* District field (read-only) */}
                      {districtDisplay && (
                        <div className="space-y-2">
                          <label
                            htmlFor="district"
                            className="block text-sm font-medium"
                          >
                            {t("profile.district") || "District"}
                          </label>
                          <Input
                            id="district"
                            value={districtDisplay}
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                            placeholder="Your district"
                          />
                        </div>
                      )}

                      <div className="pt-4 flex items-center">
                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t("profile.saving") || "Saving..."}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              {t("profile.save_changes") || "Save Changes"}
                            </>
                          )}
                        </Button>

                        {saveMessage && (
                          <span className="ml-4 text-sm text-green-600 dark:text-green-400">
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Settings */}
              <div>
                <Card className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle>
                        {t("settings.title") || "Preferences"}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {t("settings.description") ||
                        "Manage your app preferences"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Theme Settings */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">
                        {t("settings.theme") || "Theme"}
                      </h3>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant={theme === "light" ? "default" : "outline"}
                          onClick={() => setTheme("light")}
                          className="justify-start gap-2"
                        >
                          <Sun className="h-4 w-4" />
                          {t("settings.light") || "Light"}
                        </Button>
                        <Button
                          variant={theme === "dark" ? "default" : "outline"}
                          onClick={() => setTheme("dark")}
                          className="justify-start gap-2"
                        >
                          <Moon className="h-4 w-4" />
                          {t("settings.dark") || "Dark"}
                        </Button>
                        <Button
                          variant={theme === "system" ? "default" : "outline"}
                          onClick={() => setTheme("system")}
                          className="justify-start gap-2"
                        >
                          <Laptop className="h-4 w-4" />
                          {t("settings.system") || "System"}
                        </Button>
                      </div>
                    </div>

                    {/* Language Settings */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">
                        {t("settings.language") || "Language"}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={language === "en" ? "default" : "outline"}
                          onClick={() => setLanguage("en")}
                          className="justify-center"
                        >
                          English
                        </Button>
                        <Button
                          variant={language === "uz" ? "default" : "outline"}
                          onClick={() => setLanguage("uz")}
                          className="justify-center"
                        >
                          O'zbekcha
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Settings */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>{t("profile.password") || "Password"}</CardTitle>
                  </div>
                  <CardDescription>
                    {t("profile.password_description") ||
                      "Change your password to keep your account secure"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {passwordSuccess && (
                    <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-md text-sm">
                      {passwordSuccess}
                    </div>
                  )}

                  {passwordError && (
                    <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="currentPassword"
                        className="block text-sm font-medium"
                      >
                        {t("profile.current_password") || "Current Password"}
                      </label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium"
                      >
                        {t("profile.new_password") || "New Password"}
                      </label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium"
                      >
                        {t("profile.confirm_password") ||
                          "Confirm New Password"}
                      </label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="gap-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("profile.changing_password") ||
                            "Changing Password..."}
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          {t("profile.change_password") || "Change Password"}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Logout Section */}
              <Card className="shadow-sm border-destructive/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <LogOut className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-destructive">
                      {t("profile.logout") || "Logout"}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {t("profile.logout_description") ||
                      "Securely log out from your account"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("profile.logout_warning") ||
                      "When you log out, your session will be terminated on this device."}
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("logout") || "Logout"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
