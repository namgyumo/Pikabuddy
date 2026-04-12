export interface User {
  id: string;
  email: string;
  name: string;
  role: "professor" | "student" | "personal" | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  profile_color: string | null;
  school: string | null;
  department: string | null;
  student_id: string | null;
}

export interface Course {
  id: string;
  professor_id: string;
  title: string;
  description: string | null;
  objectives: string[] | null;
  invite_code: string;
  is_personal?: boolean;
  banner_url: string | null;
  custom_banner_url?: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  topic: string | null;
  type: "coding" | "writing" | "both" | "algorithm";
  status: "draft" | "published";
  problems: Problem[];
  rubric: Rubric;
  ai_policy: "free" | "normal" | "strict" | "exam";
  language: string;
  writing_prompt: string | null;
  due_date: string | null;
  show_score_to_student: boolean;
  grading_strictness: "mild" | "normal" | "strict";
  grading_note: string | null;
  generation_status?: "generating" | "completed" | "failed";
  has_submitted?: boolean;
  is_team_assignment?: boolean;
  exam_mode?: boolean;
  exam_config?: {
    screenshot_interval: number;
    max_violations: number;
    screenshot_quality: number;
    fullscreen_required: boolean;
  };
  created_at: string;
}

export interface Problem {
  id: number;
  title: string;
  description: string;
  starter_code: string;
  expected_output: string;
  hints: string[];
}

export interface Rubric {
  criteria: { name: string; weight: number; description: string }[];
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  code: string;
  status: "submitted" | "analyzing" | "completed";
  submitted_at: string;
}

export interface Snapshot {
  id: string;
  assignment_id: string;
  student_id: string;
  code_diff: Record<string, unknown>;
  cursor_position: { line: number; col: number } | null;
  is_paste: boolean;
  paste_source: "internal" | "external" | null;
  created_at: string;
}

export interface Note {
  id: string;
  student_id: string;
  course_id: string;
  parent_id: string | null;
  team_id: string | null;
  title: string;
  content: Record<string, unknown>;
  gap_analysis: Record<string, unknown> | null;
  understanding_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  course_id: string;
  name: string;
  created_by: string;
  created_at: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  student_id: string;
  name: string;
  avatar_url: string | null;
}

export interface NoteSnapshot {
  id: string;
  note_id: string;
  saved_by: string;
  saved_by_name: string;
  saved_by_avatar_url: string | null;
  title: string;
  content?: Record<string, unknown>;
  created_at: string;
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag: string;
  created_at: string;
}

export interface NoteLink {
  source_note_id: string;
  target_note_id: string;
  target_title: string;
}

export interface GraphNode {
  id: string;
  title: string;
  parent_id: string | null;
  understanding_score: number | null;
  tags: string[];
  categories?: string[];
  updated_at: string;
  created_at: string;
  content_length: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "parent" | "link" | "similar";
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface WeeklyReport {
  period: string;
  total_notes: number;
  new_notes: number;
  avg_score: number | null;
  weakest_notes: { id: string; title: string; score: number }[];
  summary: string;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  uploaded_by: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export interface AiAnalysis {
  id: string;
  submission_id: string;
  score: number | null;
  final_score: number | null;
  feedback: string | null;
  logic_analysis: Record<string, unknown> | null;
  quality_analysis: Record<string, unknown> | null;
  suggestions: string[] | null;
  created_at: string;
}

/* ── Messenger ── */

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationPartner {
  id: string;
  name: string;
  avatar_url: string | null;
  role?: string;
}

export interface ConversationItem {
  partner: ConversationPartner;
  last_message: Message | null;
  unread_count: number;
}

/* ── Note Comments ── */

export interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_avatar_url: string | null;
  block_index: number | null;
  parent_id: string | null;
  content: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentCounts {
  block_counts: Record<number, number>;
  total: number;
  unresolved: number;
}

export interface StudentNoteItem {
  id: string;
  title: string;
  updated_at: string;
  understanding_score: number | null;
  comment_count: number;
}

export interface StudentWithNotes {
  student: Pick<User, "id" | "name" | "avatar_url">;
  notes: StudentNoteItem[];
}

export interface DashboardData {
  course_id: string;
  student_count: number;
  avg_class_score: number;
  at_risk_count: number;
  students: StudentSummary[];
}

export interface StudentSummary {
  student: Pick<User, "id" | "name" | "email" | "avatar_url">;
  avg_score: number;
  avg_understanding: number;
  paste_count: number;
  gap_level: "high" | "medium" | "low";
  submission_count: number;
  status: "warning" | "ok";
}
