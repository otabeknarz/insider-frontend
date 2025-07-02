import React from "react";
import { useLanguage } from "@/lib/language-provider";
import { Task, TaskFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskForm } from "./TaskForm";

interface TaskDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  formData: TaskFormData;
  setFormData: React.Dispatch<React.SetStateAction<TaskFormData>>;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  handleSubmit: (e: React.FormEvent) => void;
  selectedTask: Task | null;
  teams: any[];
  users: any[];
  loadingTeams: boolean;
  loadingUsers: boolean;
  teamSearch: string;
  userSearch: string;
  setTeamSearch: React.Dispatch<React.SetStateAction<string>>;
  setUserSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedTeam: any | null;
  savingTask: boolean;
}

export function TaskDialog({
  isOpen,
  setIsOpen,
  formData,
  setFormData,
  handleChange,
  handleSubmit,
  selectedTask,
  teams,
  users,
  loadingTeams,
  loadingUsers,
  teamSearch,
  userSearch,
  setTeamSearch,
  setUserSearch,
  selectedTeam,
  savingTask,
}: TaskDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">
            {selectedTask ? t("tasks.editTask") : t("tasks.addTask")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <TaskForm
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            teams={teams}
            users={users}
            loadingTeams={loadingTeams}
            loadingUsers={loadingUsers}
            teamSearch={teamSearch}
            userSearch={userSearch}
            setTeamSearch={setTeamSearch}
            setUserSearch={setUserSearch}
            selectedTeam={selectedTeam}
            formId="task-form-desktop"
            prefix="desktop"
          />
        </div>

        {/* Form Actions - Fixed at bottom */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex flex-row gap-2">
            <Button
              type="submit"
              form="task-form-desktop"
              disabled={savingTask}
              className="flex-1"
              onClick={handleSubmit}
            >
              {savingTask ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("tasks.saving")}
                </span>
              ) : selectedTask ? (
                t("tasks.updateTask")
              ) : (
                t("tasks.createTask")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
