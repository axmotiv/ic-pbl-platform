"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit3, Trash2, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal, { ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { markdownToHtml } from "@/lib/utils/markdown";
import { FIELD_LABELS, PROBLEM_TYPE_LABELS, TOOL_LABELS } from "@/lib/constants/labels";
import type { AiSession } from "@/types/content";

/* ─── 페이지 ────────────────────────────────────── */

export default function MySessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<AiSession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data } = await supabase.from("ai_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setSessions(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

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

  const handleSaveEdit = async () => {
    if (!selectedSession) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("ai_sessions").update({ is_edited: true, edited_text: editText }).eq("id", selectedSession.id);
    if (!error) {
      const updated = { ...selectedSession, is_edited: true, edited_text: editText };
      setSelectedSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === selectedSession.id ? updated : s)));
      setIsEditing(false);
    }
    setSaving(false);
  };

  const getTitle = (session: AiSession): string => {
    const text = session.edited_text || session.output_text;
    const match = text.match(/##\s*문제\s*시나리오:\s*(.+)/);
    return match ? match[1].trim() : session.input_data.courseName + " PBL";
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 작업</h1>
            <p className="text-sm text-gray-500 mt-1">AI로 생성한 문제 시나리오를 관리하세요</p>
          </div>
          <a href="/tools/problem-designer">
            <Button icon={<Plus className="w-4 h-4" />}>새로 만들기</Button>
          </a>
        </div>

        {/* 모달 */}
        <Modal open={!!selectedSession} onClose={() => { setSelectedSession(null); setIsEditing(false); }}>
          {selectedSession && (
            <>
              <ModalHeader onClose={() => { setSelectedSession(null); setIsEditing(false); }}>
                <h2 className="text-lg font-bold text-gray-900 truncate">{getTitle(selectedSession)}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {new Date(selectedSession.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {selectedSession.is_edited && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">수정됨</span>
                  )}
                </div>
              </ModalHeader>

              <div className="px-5 py-3 bg-white/30 border-b border-gray-100/50">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-white/60 border border-white/30 px-2 py-1 rounded-lg text-gray-600 backdrop-blur-sm">{selectedSession.input_data.courseName}</span>
                  <span className="bg-white/60 border border-white/30 px-2 py-1 rounded-lg text-gray-600 backdrop-blur-sm">{FIELD_LABELS[selectedSession.input_data.field] || selectedSession.input_data.field}</span>
                  <span className="bg-white/60 border border-white/30 px-2 py-1 rounded-lg text-gray-600 backdrop-blur-sm">{PROBLEM_TYPE_LABELS[selectedSession.input_data.problemType] || selectedSession.input_data.problemType}</span>
                  <span className="bg-white/60 border border-white/30 px-2 py-1 rounded-lg text-gray-600 backdrop-blur-sm">{selectedSession.input_data.weeks}주</span>
                  <span className="bg-white/60 border border-white/30 px-2 py-1 rounded-lg text-gray-600 backdrop-blur-sm">{selectedSession.input_data.studentCount}명</span>
                </div>
              </div>

              <ModalBody>
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full min-h-[350px] text-sm font-mono leading-relaxed bg-white/50 border border-white/30 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y backdrop-blur-sm"
                  />
                ) : (
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-[#1e3a5f] prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-blue-700"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedSession.edited_text || selectedSession.output_text) }}
                  />
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="danger" size="sm" loading={deleting === selectedSession.id} onClick={() => handleDelete(selectedSession.id)}>
                  {deleting === selectedSession.id ? "삭제 중..." : "삭제"}
                </Button>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>취소</Button>
                      <Button size="sm" loading={saving} onClick={handleSaveEdit}>{saving ? "저장 중..." : "수정 저장"}</Button>
                    </>
                  ) : (
                    <Button variant="glass" size="sm" icon={<Edit3 className="w-4 h-4" />} onClick={() => { setEditText(selectedSession.edited_text || selectedSession.output_text); setIsEditing(true); }}>
                      수정하기
                    </Button>
                  )}
                </div>
              </ModalFooter>
            </>
          )}
        </Modal>

        {/* 세션 목록 */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500">저장된 작업이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">AI 문제설계 어시스턴트에서 시나리오를 생성하고 저장해보세요</p>
            <a href="/tools/problem-designer" className="mt-4">
              <Button>문제 설계 시작하기</Button>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full text-left glass-card rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {TOOL_LABELS[session.tool_type] || session.tool_type}
                      </span>
                      {session.is_edited && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">수정됨</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{getTitle(session)}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                      <span>{session.input_data.courseName}</span>
                      <span className="text-gray-300">|</span>
                      <span>{FIELD_LABELS[session.input_data.field] || session.input_data.field}</span>
                      <span className="text-gray-300">|</span>
                      <span>{session.input_data.weeks}주</span>
                      <span className="text-gray-300">|</span>
                      <span>{PROBLEM_TYPE_LABELS[session.input_data.problemType] || session.input_data.problemType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(session.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                      disabled={deleting === session.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      {deleting === session.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
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
