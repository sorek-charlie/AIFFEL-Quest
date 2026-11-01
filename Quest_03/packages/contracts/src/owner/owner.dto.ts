/** 설계용 DTO. DB row와 분리된 소유자 화면 데이터. */
export interface TaskView {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
  version: number;
  source?: string;
  sourceKey?: string;
  dueDate?: string | null;
  projectId?: string | null;
}
export interface ApproveBookingInput {
  expectedVersion: number;
}
export interface ApprovalResult {
  requestId: string;
  eventId: string;
  status: 'confirmed';
  startsAt: string;
  endsAt: string;
  version: number;
}
export interface InputProposalView {
  id: string;
  title: string;
  kind: 'task' | 'event';
  source: string;
  startsAt?: string;
  endsAt?: string;
  error?: string;
}
export interface AuthSessionView { configured: boolean; authenticated: boolean; }
export interface ProjectView {id: string; title: string; startsOn: string; endsOn: string; status: 'planned' | 'active' | 'completed'; version: number; progress?: number | null; notes?: string;}
export interface OwnerEventDetails {details?: string; participants?: string; location?: string;}
export interface GoogleConnectionView {
  account: string;
  connected: boolean;
  clientConfigured: boolean;
  email: string | null;
  gmailIntervalMinutes: number;
  calendarIntervalSeconds: number;
}
