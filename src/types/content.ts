export type ContentType =
  | "short_video"
  | "deep_dive"
  | "template"
  | "case_series"
  | "interactive";

export type ContentFormat = "video" | "document" | "template" | "podcast";

export type SubjectArea =
  | "pbl_design"
  | "qbl"
  | "facilitation"
  | "team"
  | "assessment"
  | "active_learning";

export type AcademicField =
  | "engineering"
  | "medical"
  | "business"
  | "social"
  | "humanities"
  | "science"
  | "education"
  | "arts";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Content {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  format: ContentFormat;
  video_url: string | null;
  video_platform: "vimeo" | "youtube" | null;
  thumbnail_url: string | null;
  file_url: string | null;
  duration_minutes: number | null;
  subject_area: SubjectArea;
  academic_field: AcademicField;
  pbl_stage: string;
  difficulty: Difficulty;
  series_id: string | null;
  episode_number: number | null;
  author_id: string;
  view_count: number;
  bookmark_count: number;
  average_rating: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: "professor" | "student" | "admin";
  university: string;
  department: string;
  pbl_level: "beginner" | "intermediate" | "advanced";
  interests: string[];
  updated_at: string;
}

export interface Review {
  id: string;
  content_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: Profile;
}

export interface AiSession {
  id: string;
  user_id: string;
  tool_type: "problem_designer";
  input_data: {
    courseName: string;
    learningObjectives: string;
    field: string;
    studentCount: number;
    weeks: number;
    additionalContext?: string;
    problemType: string;
  };
  output_text: string;
  is_edited: boolean;
  edited_text: string | null;
  created_at: string;
}
