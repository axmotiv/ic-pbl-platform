export const TYPE_CONFIG: Record<string, { label: string; gradient: string }> = {
  short_video: { label: "숏폼", gradient: "from-rose-500 to-pink-600" },
  deep_dive: { label: "심화강의", gradient: "from-blue-500 to-indigo-600" },
  template: { label: "템플릿", gradient: "from-emerald-500 to-teal-600" },
  case_series: { label: "사례시리즈", gradient: "from-purple-500 to-violet-600" },
  interactive: { label: "인터랙티브", gradient: "from-amber-500 to-orange-600" },
};

export const TYPE_COLOR_CONFIG: Record<string, { label: string; color: string }> = {
  short_video: { label: "숏폼영상", color: "bg-rose-500" },
  deep_dive: { label: "심화강의", color: "bg-blue-600" },
  template: { label: "템플릿", color: "bg-emerald-500" },
  case_series: { label: "사례시리즈", color: "bg-purple-500" },
  interactive: { label: "인터랙티브", color: "bg-amber-500" },
};

export const SUBJECT_LABELS: Record<string, string> = {
  pbl_design: "PBL설계",
  qbl: "QBL",
  facilitation: "퍼실리테이션",
  team: "팀운영",
  assessment: "평가",
  active_learning: "액티브러닝",
};

export const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: "입문", color: "bg-green-100/80 text-green-700" },
  intermediate: { label: "실천", color: "bg-yellow-100/80 text-yellow-700" },
  advanced: { label: "심화", color: "bg-red-100/80 text-red-700" },
};

export const FIELD_LABELS: Record<string, string> = {
  engineering: "공학",
  medical: "의료/보건",
  business: "경영",
  social: "사회과학",
  humanities: "인문학",
  science: "자연과학",
  education: "교육학",
  arts: "예술/디자인",
};

export const PROBLEM_TYPE_LABELS: Record<string, string> = {
  "ic-pbl": "산업체 연계형",
  community: "지역사회 문제해결형",
  academic: "학문 탐구형",
};

export const TOOL_LABELS: Record<string, string> = {
  problem_designer: "문제설계 어시스턴트",
};
