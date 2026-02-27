"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, Star, Heart, PlayCircle } from "lucide-react";
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
  const [bouncing, setBouncing] = useState(false);

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

    setBouncing(true);
    setTimeout(() => setBouncing(false), 300);

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
      className="group cursor-pointer glass-card rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/[0.08]"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-100/50 overflow-hidden">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
            <PlayCircle className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
          </div>
        )}

        {/* hover 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors duration-200">
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
              bouncing ? "animate-spring-bounce" : ""
            } ${
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
