import React from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { User } from "@/lib/types";

interface UserMultiSelectProps {
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholderText: string;
  searchPlaceholder: string;
  id: string;
  userSearch: string;
  onUserSearchChange: (search: string) => void;
  loadingUsers: boolean;
}

export function UserMultiSelect({
  users,
  selectedUserIds,
  onSelectionChange,
  placeholderText,
  searchPlaceholder,
  id,
  userSearch,
  onUserSearchChange,
  loadingUsers,
}: UserMultiSelectProps) {
  // Ensure selectedUserIds is always an array, even if it's undefined
  const safeSelectedUserIds = selectedUserIds || [];
  
  // Filter out already selected users
  const filteredUsers = users.filter(
    (user) => !safeSelectedUserIds.includes(user.id.toString())
  );

  return (
    <div className="space-y-2">
      {/* Display selected users as tags */}
      {safeSelectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {safeSelectedUserIds.map((userId) => {
            const user = users.find((u) => u.id.toString() === userId);
            return user ? (
              <div
                key={userId}
                className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center"
              >
                <span>{`${user.first_name} ${user.last_name}`}</span>
                <button
                  type="button"
                  className="ml-1 text-primary hover:text-primary/80"
                  onClick={() => {
                    onSelectionChange(
                      safeSelectedUserIds.filter((id) => id !== userId)
                    );
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* User selection dropdown */}
      <Select
        name="user_select"
        value=""
        onValueChange={(value) => {
          if (value && !safeSelectedUserIds.includes(value)) {
            onSelectionChange([...safeSelectedUserIds, value]);
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholderText} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={userSearch}
              onChange={(e) => onUserSearchChange(e.target.value)}
              className="text-sm"
            />
          </div>
          {loadingUsers ? (
            <div className="p-2 text-center">
              <div className="animate-spin h-4 w-4 mx-auto border-b-2 border-primary rounded-full"></div>
            </div>
          ) : (
            filteredUsers
              .filter(
                (user) =>
                  `${user.first_name} ${user.last_name}`
                    .toLowerCase()
                    .includes(userSearch.toLowerCase()) ||
                  user.username.toLowerCase().includes(userSearch.toLowerCase())
              )
              .map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {`${user.first_name} ${user.last_name}`}
                </SelectItem>
              ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
