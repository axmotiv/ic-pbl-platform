"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AiSession } from "@/types/content";

/* ─── 라벨 매핑 ────────────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  engineering: "공학",
  medical: "의료/보건",
  business: "경영",
  social: "사회과학",
  humanities: "인문학",
  science: "자연과학",
  education: "교육학",
  arts: "예술/디자인",
};

const PROBLEM_TYPE_LABELS: Record<string, string> = {
  "ic-pbl": "산업체 연계형",
  community: "지역사회 문제해결형",
  academic: "학문 탐구형",
};

const TOOL_LABELS: Record<string, string> = {
  problem_designer: "문제설계 어시스턴트",
};

/* ─── 페이지 ────────────────────────────────────── */

export default function MySessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AiSession | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  /* ─── 세션 목록 로드 ─── */

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data } = await supabase
      .from("ai_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setSessions(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ─── 삭제 ─── */

  const handleDelete = async (id: string) => {
    if (!confirm("이 작업을 삭제하시겠습니까?")) return;
    setDeleting(id);

    const supabase = createClient();
    const { error } = await supabase.from("ai_sessions").delete().eq("id", id);

    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    }
    setDeleting(null);
  };

  /* ─── 수정 저장 ─── */

  const handleSaveEdit = async () => {
    if (!selectedSession) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("ai_sessions")
      .update({
        is_edited: true,
        edited_text: editText,
      })
      .eq("id", selectedSession.id);

    if (!error) {
      const updated = {
        ...selectedSession,
        is_edited: true,
        edited_text: editText,
      };
      setSelectedSession(updated);
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedSession.id ? updated : s))
      );
      setIsEditing(false);
    }
    setSaving(false);
  };

  /* ─── 시나리오 제목 추출 ─── */

  const getTitle = (session: AiSession): string => {
    const text = session.edited_text || session.output_text;
    const match = text.match(/##\s*문제\s*시나리오:\s*(.+)/);
    return match ? match[1].trim() : session.input_data.courseName + " PBL";
  };

  /* ─── 렌더 ─── */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 작업</h1>
            <p className="text-sm text-gray-500 mt-1">
              AI로 생성한 문제 시나리오를 관리하세요
            </p>
          </div>
          <a
            href="/tools/problem-designer"
            className="px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#16304f] transition flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            새로 만들기
          </a>
        </div>

        {/* 상세 보기 모달 */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => {
                setSelectedSession(null);
                setIsEditing(false);
              }}
            />
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-3xl max-h-[85vh] flex flex-col z-10">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {getTitle(selectedSession)}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {new Date(
                        selectedSession.created_at
                      ).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    {selectedSession.is_edited && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        수정됨
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setIsEditing(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* 입력값 요약 */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {selectedSession.input_data.courseName}
                  </span>
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {FIELD_LABELS[selectedSession.input_data.field] ||
                      selectedSession.input_data.field}
                  </span>
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {PROBLEM_TYPE_LABELS[
                      selectedSession.input_data.problemType
                    ] || selectedSession.input_data.problemType}
                  </span>
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {selectedSession.input_data.weeks}주
                  </span>
                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-600">
                    {selectedSession.input_data.studentCount}명
                  </span>
                </div>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto p-5">
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full min-h-[350px] text-sm font-mono leading-relaxed border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-[#1e3a5f] prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-blue-700"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(
                        selectedSession.edited_text ||
                          selectedSession.output_text
                      ),
                    }}
                  />
                )}
              </div>

              {/* 모달 하단 액션 */}
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <button
                  onClick={() => handleDelete(selectedSession.id)}
                  disabled={deleting === selectedSession.id}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  {deleting === selectedSession.id ? "삭제 중..." : "삭제"}
                </button>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {saving ? "저장 중..." : "수정 저장"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditText(
                          selectedSession.edited_text ||
                            selectedSession.output_text
                        );
                        setIsEditing(true);
                      }}
                      className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      수정하기
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 세션 목록 */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500">
              저장된 작업이 없습니다
            </p>
            <p className="text-sm text-gray-400 mt-1">
              AI 문제설계 어시스턴트에서 시나리오를 생성하고 저장해보세요
            </p>
            <a
              href="/tools/problem-designer"
              className="mt-4 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#16304f] transition"
            >
              문제 설계 시작하기
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full text-left bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 hover:border-gray-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {TOOL_LABELS[session.tool_type] || session.tool_type}
                      </span>
                      {session.is_edited && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          수정됨
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {getTitle(session)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>{session.input_data.courseName}</span>
                      <span className="text-gray-300">|</span>
                      <span>
                        {FIELD_LABELS[session.input_data.field] ||
                          session.input_data.field}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>{session.input_data.weeks}주</span>
                      <span className="text-gray-300">|</span>
                      <span>
                        {PROBLEM_TYPE_LABELS[
                          session.input_data.problemType
                        ] || session.input_data.problemType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(session.created_at).toLocaleDateString(
                        "ko-KR",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      disabled={deleting === session.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      {deleting === session.id ? (
                        <svg
                          className="w-4 h-4 animate-spin"
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
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                    <svg
                      className="w-4 h-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 간단한 마크다운 → HTML 변환 ──────────────── */

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-5 list-decimal">$2</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li class="ml-5 list-disc">$1</li>')
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<p><h([23])>/g, "<h$1>")
    .replace(/<\/h([23])><\/p>/g, "</h$1>")
    .replace(/<p><li/g, "<li")
    .replace(/<\/li><\/p>/g, "</li>")
    .replace(/<p><\/p>/g, "");
}
