"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, Star, Heart } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { TYPE_CONFIG, SUBJECT_LABELS, DIFFICULTY_CONFIG } from "@/lib/constants/labels";
import type { Content } from "@/types/content";

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
    gradient: "from-gray-500 to-gray-600",
  };
  const subjectLabel = SUBJECT_LABELS[content.subject_area] ?? content.subject_area;
  const difficultyConfig = DIFFICULTY_CONFIG[content.difficulty] ?? {
    label: content.difficulty,
    color: "bg-gray-100/80 text-gray-700",
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
      className="group cursor-pointer glass-card rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100/50 overflow-hidden">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
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
        <div className="absolute top-3 left-3">
          <Badge variant="gradient" gradient={typeConfig.gradient}>
            {typeConfig.label}
          </Badge>
        </div>

        {/* 소요시간 뱃지 */}
        <div className="absolute bottom-3 right-3">
          <Badge variant="glass" size="xs" className="rounded-md font-medium">
            {durationDisplay}
          </Badge>
        </div>
      </div>

      {/* 카드 콘텐츠 */}
      <div className="p-4">
        {/* 제목 */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
          {content.title}
        </h3>

        {/* 태그들 */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <Badge size="xs" className="rounded-full">{subjectLabel}</Badge>
          <Badge size="xs" color={difficultyConfig.color} className="rounded-full">
            {difficultyConfig.label}
          </Badge>
        </div>

        {/* 하단: 조회수, 별점, 북마크 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {content.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              {content.average_rating > 0 ? content.average_rating.toFixed(1) : "-"}
            </span>
          </div>

          {/* 북마크 버튼 */}
          <button
            onClick={handleBookmarkToggle}
            disabled={!userId || bookmarkLoading}
            className={`p-1.5 rounded-full transition-all duration-200 ${
              bookmarked
                ? "text-rose-500 hover:bg-rose-50/60"
                : "text-gray-300 hover:text-rose-400 hover:bg-gray-50/60"
            } ${!userId ? "opacity-40 cursor-default" : ""}`}
            aria-label={bookmarked ? "북마크 해제" : "북마크"}
          >
            <Heart className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </article>
  );
}
