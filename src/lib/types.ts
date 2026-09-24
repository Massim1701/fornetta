export type Provider = "anthropic" | "google";
export type SenderType = "agent" | "user";

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface AgentRow {
  id: string;
  project_id: string;
  name: string;
  role: string;
  provider: Provider;
  created_at: string;
}

export interface MessageRow {
  id: string;
  project_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  created_at: string;
}
