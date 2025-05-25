// Define common types used throughout the application

export interface Position {
  id: number;
  name: string;
}

export interface Region {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  region: number;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  position: Position;
  region: Region;
  district: District;
  created_at: string;
  updated_at: string;
  date_joined: string;
}

export interface Comment {
  id: number;
  created_at: string;
  updated_at: string;
  message: string;
  is_read: boolean;
  task: number;
  user: number;
}

export interface Task {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  status: number;
  is_checked: boolean;
  priority: number;
  deadline: string;
  created_by: User;
  team: number | null;
  assigned_users: User[];
  comments: Comment[];
}

export interface Team {
  id: number;
  name: string;
  description: string;
  members: User[];
}

// Status and priority mappings based on backend model
export const TaskStatus = {
  ASSIGNED: 1,
  RECEIVED: 2,
  IN_PROCESS: 3,
  COMPLETED: 4,
};

export const TaskPriority = {
  DEFAULT: 1,
  HIGH: 2,
};
