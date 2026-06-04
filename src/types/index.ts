export interface Session {
  id: string;
  title: string;
  profile_name: string;
  model: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  tokens_used: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tokens: number;
  created_at: string;
  metadata?: string;
}

export interface Profile {
  name: string;
  provider: string;
  model: string;
  created_at: string;
}

export interface ModelConfig {
  name: string;
  provider: string;
  model_id: string;
  base_url?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  created_at: string;
  tags: string[];
}

export interface AppInfo {
  version: string;
  os: string;
  hermes_installed: boolean;
  active_profile: string | null;
  sessions_count: number;
}

export interface DependencyStatus {
  git_installed: boolean;
  uv_installed: boolean;
  python_installed: boolean;
  python_version: string | null;
  wsl_available: boolean | null;
}

export interface Gateway {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface CronJob {
  id: string;
  name: string;
  cron_expression: string;
  command: string;
  target: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export interface Tool {
  name: string;
  description: string;
  enabled: boolean;
}

export interface Skill {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
}
export interface KanbanColumn {
  id: string;
  name: string;
  cards: KanbanCard[];
}
export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface MemoryProvider {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface ConfigHealth {
  provider_configured: boolean;
  model_configured: boolean;
  api_key_set: boolean;
  hermes_installed: boolean;
  python_version: string;
  warnings: string[];
}
