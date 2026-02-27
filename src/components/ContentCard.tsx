"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Content } from "@/types/content";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  short_video: { label: "숏폼", color: "bg-rose-500" },
  deep_dive: { label: "심화강의", color: "bg-blue-600" },
  template: { label: "템플릿", color: "bg-emerald-500" },
  case_series: { label: "사례시리즈", color: "bg-purple-500" },
  interactive: { label: "인터랙티브", color: "bg-amber-500" },
};

const SUBJECT_LABELS: Record<string, string> = {
  pbl_design: "PBL설계",
  qbl: "QBL",
  facilitation: "퍼실리테이션",
  team: "팀운영",
  assessment: "평가",
  active_learning: "액티브러닝",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  beginner: { label: "입문", color: "bg-green-100 text-green-700" },
  intermediate: { label: "실천", color: "bg-yellow-100 text-yellow-700" },
  advanced: { label: "심화", color: "bg-red-100 text-red-700" },
};

interface ContentCardProps {
  content: Content;
  isBookmarked?: boolean;
  userId?: string | null;
}

export default function ContentCard({
  content,
  isBookmarked = false,
  userId,
}: ContentCardProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const typeConfig = TYPE_CONFIG[content.type] ?? {
    label: content.type,
    color: "bg-gray-500",
  };
  const subjectLabel = SUBJECT_LABELS[content.subject_area] ?? content.subject_area;
  const difficultyConfig = DIFFICULTY_CONFIG[content.difficulty] ?? {
    label: content.difficulty,
    color: "bg-gray-100 text-gray-700",
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || bookmarkLoading) return;

    setBookmarkLoading(true);
    const supabase = createClient();

    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("content_id", content.id);
      setBookmarked(false);
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: userId, content_id: content.id });
      setBookmarked(true);
    }
    setBookmarkLoading(false);
  };

  const durationDisplay = content.duration_minutes
    ? `${content.duration_minutes}분`
    : "즉시 활용";

  return (
    <article
      onClick={() => router.push(`/contents/${content.id}`)}
      className="group cursor-pointer bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg
              className="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}

        {/* 유형 뱃지 */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold text-white rounded-lg ${typeConfig.color}`}
        >
          {typeConfig.label}
        </span>

        {/* 소요시간 뱃지 */}
        <span className="absolute bottom-3 right-3 px-2 py-0.5 text-xs font-medium text-white bg-black/70 rounded-md">
          {durationDisplay}
        </span>
      </div>

      {/* 카드 콘텐츠 */}
      <div className="p-4">
        {/* 제목 */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
          {content.title}
        </h3>

        {/* 태그들 */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
            {subjectLabel}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${difficultyConfig.color}`}
          >
            {difficultyConfig.label}
          </span>
        </div>

        {/* 하단: 조회수, 별점, 북마크 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            {/* 조회수 */}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {content.view_count.toLocaleString()}
            </span>

            {/* 별점 */}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {content.average_rating > 0 ? content.average_rating.toFixed(1) : "-"}
            </span>
          </div>

          {/* 북마크 버튼 */}
          <button
            onClick={handleBookmarkToggle}
            disabled={!userId || bookmarkLoading}
            className={`p-1.5 rounded-full transition-colors ${
              bookmarked
                ? "text-rose-500 hover:bg-rose-50"
                : "text-gray-300 hover:text-rose-400 hover:bg-gray-50"
            } ${!userId ? "opacity-40 cursor-default" : ""}`}
            aria-label={bookmarked ? "북마크 해제" : "북마크"}
          >
            <svg
              className="w-4.5 h-4.5"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
