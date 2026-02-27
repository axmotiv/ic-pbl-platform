"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Content } from "@/types/content";

/* ─── 상수 ──────────────────────────────────────── */

const FIELD_OPTIONS = [
  { value: "engineering", label: "공학" },
  { value: "medical", label: "의료/보건" },
  { value: "business", label: "경영" },
  { value: "social", label: "사회과학" },
  { value: "humanities", label: "인문학" },
  { value: "science", label: "자연과학" },
  { value: "education", label: "교육학" },
  { value: "arts", label: "예술/디자인" },
];

const PROBLEM_TYPES = [
  {
    value: "ic-pbl",
    label: "산업체 연계형 (IC-PBL)",
    desc: "기업·산업 현장의 실제 문제를 활용",
  },
  {
    value: "community",
    label: "지역사회 문제해결형",
    desc: "지역사회의 실제 이슈를 해결",
  },
  {
    value: "academic",
    label: "학문 탐구형",
    desc: "학문적 질문을 깊이 탐구",
  },
];

const SUBJECT_MAP: Record<string, string> = {
  engineering: "pbl_design",
  medical: "pbl_design",
  business: "pbl_design",
  social: "pbl_design",
  humanities: "pbl_design",
  science: "pbl_design",
  education: "pbl_design",
  arts: "pbl_design",
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  short_video: { label: "숏폼영상", color: "bg-rose-500" },
  deep_dive: { label: "심화강의", color: "bg-blue-600" },
  template: { label: "템플릿", color: "bg-emerald-500" },
  case_series: { label: "사례시리즈", color: "bg-purple-500" },
  interactive: { label: "인터랙티브", color: "bg-amber-500" },
};

/* ─── 타입 ──────────────────────────────────────── */

interface FormData {
  courseName: string;
  learningObjectives: string;
  field: string;
  studentCount: string;
  weeks: string;
  additionalContext: string;
  problemType: string;
}

const initialForm: FormData = {
  courseName: "",
  learningObjectives: "",
  field: "engineering",
  studentCount: "30",
  weeks: "8",
  additionalContext: "",
  problemType: "ic-pbl",
};

/* ─── 페이지 ────────────────────────────────────── */

export default function ProblemDesignerPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [relatedContents, setRelatedContents] = useState<Content[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ─── 폼 핸들러 ─── */

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ─── AI 생성 ─── */

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    if (!form.courseName.trim() || !form.learningObjectives.trim()) return;

    setIsGenerating(true);
    setResult("");
    setIsEditing(false);
    setWasEdited(false);
    setSaveStatus("idle");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/problem-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          studentCount: parseInt(form.studentCount) || 30,
          weeks: parseInt(form.weeks) || 8,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "요청 실패");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트리밍을 시작할 수 없습니다");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setResult(accumulated);

        // 결과 패널 자동 스크롤
        if (resultRef.current) {
          resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setResult(
        (prev) =>
          prev +
          `\n\n---\n오류가 발생했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [form, isGenerating]);

  /* ─── 관련 콘텐츠 로드 ─── */

  useEffect(() => {
    if (!result) return;

    const subjectArea = SUBJECT_MAP[form.field] || "pbl_design";
    const supabase = createClient();
    supabase
      .from("contents")
      .select("*")
      .eq("is_published", true)
      .eq("subject_area", subjectArea)
      .limit(3)
      .order("view_count", { ascending: false })
      .then(({ data }) => {
        if (data) setRelatedContents(data);
      });
  }, [result, form.field]);

  /* ─── 수정 모드 ─── */

  const [wasEdited, setWasEdited] = useState(false);

  const handleEdit = () => {
    setEditText(result);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setResult(editText);
    setIsEditing(false);
    setWasEdited(true);
  };

  /* ─── 저장 (ai_sessions 테이블) ─── */

  const handleSave = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("저장하려면 로그인이 필요합니다.");
      return;
    }

    setSaveStatus("saving");

    const { error } = await supabase.from("ai_sessions").insert({
      user_id: user.id,
      tool_type: "problem_designer",
      input_data: {
        courseName: form.courseName,
        learningObjectives: form.learningObjectives,
        field: form.field,
        studentCount: parseInt(form.studentCount) || 30,
        weeks: parseInt(form.weeks) || 8,
        additionalContext: form.additionalContext || undefined,
        problemType: form.problemType,
      },
      output_text: result,
      is_edited: wasEdited,
      edited_text: wasEdited ? result : null,
    });

    setSaveStatus(error ? "error" : "saved");
  };

  /* ─── PDF 내보내기 ─── */

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PBL 문제 시나리오</title>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#222}
h2{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px}
h3{color:#2563eb;margin-top:24px}
@media print{body{margin:20px}}
</style></head><body>${markdownToHtml(result)}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  /* ─── 유효성 ─── */

  const isValid = form.courseName.trim() && form.learningObjectives.trim();

  /* ─── 렌더 ─── */

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* 2열 레이아웃: lg 이상에서 좌우 분할 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── 왼쪽: 입력 패널 ─── */}
          <div className="space-y-5">
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900">
                AI 문제설계 어시스턴트
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                학습목표와 맥락을 입력하면, AI가 PBL 문제 시나리오를 설계합니다
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5 animate-fade-in" style={{animationDelay:"0.1s"}}>
              {/* 과목명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  과목명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.courseName}
                  onChange={(e) => updateField("courseName", e.target.value)}
                  placeholder="예: 간호학개론, 산업공학설계"
                  className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm"
                />
              </div>

              {/* 학습목표 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  학습목표 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.learningObjectives}
                  onChange={(e) =>
                    updateField("learningObjectives", e.target.value)
                  }
                  placeholder="이 수업을 통해 학생들이 달성해야 할 학습목표를 적어주세요"
                  className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition resize-none backdrop-blur-sm"
                />
              </div>

              {/* 전공 분야 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  전공 분야
                </label>
                <select
                  value={form.field}
                  onChange={(e) => updateField("field", e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 수강 인원 & 운영 주차 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    수강 인원
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.studentCount}
                    onChange={(e) =>
                      updateField("studentCount", e.target.value)
                    }
                    className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    운영 주차
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={form.weeks}
                    onChange={(e) => updateField("weeks", e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* 추가 맥락 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  추가 맥락{" "}
                  <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.additionalContext}
                  onChange={(e) =>
                    updateField("additionalContext", e.target.value)
                  }
                  placeholder="수업 특성, 학생 수준, 연계하고 싶은 실제 문제 등"
                  className="w-full px-4 py-2.5 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition resize-none backdrop-blur-sm"
                />
              </div>

              {/* 문제 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 유형
                </label>
                <div className="space-y-2">
                  {PROBLEM_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        form.problemType === type.value
                          ? "border-blue-500/50 bg-blue-50/50 shadow-md shadow-blue-500/10"
                          : "border-white/30 hover:border-white/50 glass"
                      }`}
                    >
                      <input
                        type="radio"
                        name="problemType"
                        value={type.value}
                        checked={form.problemType === type.value}
                        onChange={(e) =>
                          updateField("problemType", e.target.value)
                        }
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-800">
                          {type.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {type.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 생성 버튼 */}
              <button
                onClick={handleGenerate}
                disabled={!isValid || isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
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
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    문제 시나리오 생성
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─── 오른쪽: 결과 패널 ─── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">생성 결과</h2>
              {isGenerating && (
                <span className="flex items-center gap-1.5 text-xs text-blue-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  AI가 작성 중...
                </span>
              )}
            </div>

            {/* 결과 카드 */}
            <div
              ref={resultRef}
              className="glass-card rounded-2xl min-h-[500px] max-h-[calc(100vh-180px)] overflow-y-auto"
            >
              {!result && !isGenerating ? (
                /* 빈 상태 */
                <div className="flex flex-col items-center justify-center h-[500px] text-center px-6">
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
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    왼쪽에 정보를 입력하고
                  </p>
                  <p className="text-gray-500 font-medium">
                    &apos;문제 시나리오 생성&apos; 버튼을 누르세요
                  </p>
                  <p className="text-xs text-gray-400 mt-3 max-w-xs">
                    AI가 입력한 학습목표와 맥락에 맞는 PBL 문제 시나리오를
                    자동으로 설계합니다
                  </p>
                </div>
              ) : isEditing ? (
                /* 수정 모드 */
                <div className="p-5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full min-h-[400px] text-sm font-mono leading-relaxed bg-white/50 border border-white/30 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y backdrop-blur-sm"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                      수정 완료
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* 결과 표시 */
                <div className="p-5 sm:p-6">
                  <div
                    className="prose prose-sm max-w-none prose-headings:text-[#1e3a5f] prose-h2:text-xl prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-h3:text-blue-700 prose-li:marker:text-blue-500"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(result) }}
                  />
                  {isGenerating && (
                    <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            {result && !isGenerating && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 transition flex items-center gap-1.5"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  다시 생성
                </button>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 transition flex items-center gap-1.5"
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
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                    saveStatus === "saved"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : saveStatus === "error"
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {saveStatus === "saving" ? (
                    <>
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
                      저장 중...
                    </>
                  ) : saveStatus === "saved" ? (
                    <>
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      저장 완료
                    </>
                  ) : (
                    <>
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
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        />
                      </svg>
                      저장하기
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2.5 glass rounded-xl text-sm font-medium text-gray-700 hover:bg-white/80 transition flex items-center gap-1.5"
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  PDF 내보내기
                </button>
              </div>
            )}

            {/* 관련 콘텐츠 */}
            {result && !isGenerating && relatedContents.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  이 주제 관련 콘텐츠
                </h3>
                <div className="space-y-2">
                  {relatedContents.map((c) => {
                    const config = TYPE_CONFIG[c.type] || {
                      label: c.type,
                      color: "bg-gray-500",
                    };
                    return (
                      <a
                        key={c.id}
                        href={`/contents/${c.id}`}
                        className="flex items-center gap-3 p-3 glass-card rounded-xl hover:bg-white/80 transition-all duration-200"
                      >
                        <span
                          className={`${config.color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0`}
                        >
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-800 truncate">
                          {c.title}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400 shrink-0 ml-auto"
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
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
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
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
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
