"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, Star, Clock, Heart, Share2, Download, Zap } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  TYPE_CONFIG,
  SUBJECT_LABELS,
  DIFFICULTY_CONFIG,
  PBL_STAGE_LABELS,
} from "@/lib/constants/labels";
import type { Content, Profile, Review } from "@/types/content";

/* ─── 비디오 임베드 URL 추출 ─────────────────────── */

function getEmbedUrl(videoUrl: string, platform: "vimeo" | "youtube"): string {
  if (platform === "youtube") {
    const match =
      videoUrl.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ?? null;
    return match
      ? `https://www.youtube.com/embed/${match[1]}?rel=0`
      : videoUrl;
  }
  const match = videoUrl.match(/vimeo\.com\/(\d+)/) ?? null;
  return match
    ? `https://player.vimeo.com/video/${match[1]}?byline=0&portrait=0`
    : videoUrl;
}

/* ─── 메인 페이지 컴포넌트 ───────────────────────── */

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [content, setContent] = useState<Content | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 시리즈
  const [seriesEpisodes, setSeriesEpisodes] = useState<Content[]>([]);

  // 리뷰
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  // 관련 콘텐츠
  const [relatedContents, setRelatedContents] = useState<Content[]>([]);
  const [relatedBookmarks, setRelatedBookmarks] = useState<Set<string>>(
    new Set()
  );

  const viewIncremented = useRef(false);

  // 데이터 로딩
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: contentData, error } = await supabase
      .from("contents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !contentData) {
      setLoading(false);
      return;
    }

    setContent(contentData);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", contentData.author_id)
      .single();
    if (profileData) setAuthor(profileData);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: bm } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("content_id", id)
        .maybeSingle();
      setBookmarked(!!bm);

      const { data: myReview } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user.id)
        .eq("content_id", id)
        .maybeSingle();
      if (myReview) {
        setExistingReview(myReview);
        setMyRating(myReview.rating);
        setReviewComment(myReview.comment);
      }
    }

    if (contentData.series_id) {
      const { data: episodes } = await supabase
        .from("contents")
        .select("*")
        .eq("series_id", contentData.series_id)
        .eq("is_published", true)
        .order("episode_number", { ascending: true });
      if (episodes) setSeriesEpisodes(episodes);
    }

    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*, profiles(id, name, university)")
      .eq("content_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (reviewsData) setReviews(reviewsData as Review[]);

    const { data: related } = await supabase
      .from("contents")
      .select("*")
      .eq("is_published", true)
      .eq("subject_area", contentData.subject_area)
      .neq("id", id)
      .order("view_count", { ascending: false })
      .limit(4);
    if (related) {
      setRelatedContents(related);
      if (user) {
        const relIds = related.map((r) => r.id);
        const { data: relBm } = await supabase
          .from("bookmarks")
          .select("content_id")
          .eq("user_id", user.id)
          .in("content_id", relIds);
        if (relBm)
          setRelatedBookmarks(new Set(relBm.map((b) => b.content_id)));
      }
    }

    if (!viewIncremented.current) {
      viewIncremented.current = true;
      await supabase.rpc("increment_view_count", { content_id: id });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookmark = async () => {
    if (!userId || bookmarkLoading) return;
    setBookmarkLoading(true);
    const supabase = createClient();

    if (bookmarked) {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("content_id", id);
      setBookmarked(false);
    } else {
      await supabase
        .from("bookmarks")
        .insert({ user_id: userId, content_id: id });
      setBookmarked(true);
    }
    setBookmarkLoading(false);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || myRating === 0 || reviewSubmitting) return;
    setReviewSubmitting(true);
    const supabase = createClient();

    if (existingReview) {
      await supabase
        .from("reviews")
        .update({ rating: myRating, comment: reviewComment })
        .eq("id", existingReview.id);
    } else {
      await supabase.from("reviews").insert({
        content_id: id,
        user_id: userId,
        rating: myRating,
        comment: reviewComment,
      });
    }

    const { data: refreshed } = await supabase
      .from("reviews")
      .select("*, profiles(id, name, university)")
      .eq("content_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (refreshed) setReviews(refreshed as Review[]);

    setExistingReview({ ...existingReview, rating: myRating, comment: reviewComment } as Review);
    setReviewSubmitting(false);
  };

  /* ─── 로딩 상태 ──────────────────────────────── */

  if (loading) return <DetailSkeleton />;

  if (!content) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-gray-500">
          콘텐츠를 찾을 수 없습니다
        </p>
        <Button variant="ghost" onClick={() => router.push("/contents")}>
          콘텐츠 허브로 돌아가기
        </Button>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[content.type] ?? {
    label: content.type,
    gradient: "from-gray-500 to-gray-600",
  };
  const subjectLabel =
    SUBJECT_LABELS[content.subject_area] ?? content.subject_area;
  const difficultyConfig = DIFFICULTY_CONFIG[content.difficulty] ?? {
    label: content.difficulty,
    color: "bg-gray-100 text-gray-700",
  };
  const pblStageLabel =
    PBL_STAGE_LABELS[content.pbl_stage] ?? content.pbl_stage;
  const isVideo = content.video_url && content.video_platform;
  const isTemplate = content.type === "template";

  return (
    <div className="min-h-screen">
      {/* 비디오 플레이어 */}
      {isVideo && (
        <div className="bg-black">
          <div className="max-w-5xl mx-auto">
            <div className="relative w-full aspect-video">
              <iframe
                src={getEmbedUrl(content.video_url!, content.video_platform!)}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={content.title}
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">
          {/* 좌측: 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 제목 & 메타 */}
            <section className="animate-fade-in">
              <Badge variant="gradient" gradient={typeConfig.gradient} className="mb-3">
                {typeConfig.label}
              </Badge>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {content.title}
              </h1>

              {/* 작성자 정보 */}
              {author && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-semibold text-sm shrink-0 shadow-md shadow-blue-500/20">
                    {author.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {author.name}
                    </p>
                    <p className="text-xs text-gray-500">{author.university}</p>
                  </div>
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-gray-500">
                <span>
                  {new Date(content.created_at).toLocaleDateString("ko-KR")}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  조회 {content.view_count.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {content.average_rating > 0
                    ? `${content.average_rating.toFixed(1)}점`
                    : "평가 없음"}
                </span>
                {content.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {content.duration_minutes}분
                  </span>
                )}
              </div>

              {/* 태그들 */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge className="rounded-full">{subjectLabel}</Badge>
                <Badge color={difficultyConfig.color} className="rounded-full">
                  {difficultyConfig.label}
                </Badge>
                {content.pbl_stage && (
                  <Badge color="bg-gray-100 text-gray-600" className="rounded-full">
                    {pblStageLabel}
                  </Badge>
                )}
              </div>
            </section>

            {/* 설명 */}
            <section className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                소개
              </h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {content.description}
              </div>
            </section>

            {/* 시리즈 에피소드 */}
            {seriesEpisodes.length > 1 && (
              <section className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  이 시리즈의 다른 에피소드
                </h2>
                <div className="space-y-2">
                  {seriesEpisodes.map((ep) => {
                    const isCurrent = ep.id === content.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() =>
                          !isCurrent && router.push(`/contents/${ep.id}`)
                        }
                        className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all duration-200 ${
                          isCurrent
                            ? "bg-blue-50 border-2 border-blue-200"
                            : "glass hover:bg-white/80 hover:shadow-md cursor-pointer"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isCurrent
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {ep.episode_number ?? "-"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate ${
                              isCurrent ? "text-blue-700" : "text-gray-900"
                            }`}
                          >
                            {ep.title}
                          </p>
                          {ep.duration_minutes && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {ep.duration_minutes}분
                            </p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-xs font-medium text-blue-600 shrink-0">
                            현재 재생 중
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 리뷰 섹션 */}
            <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                리뷰
              </h2>

              {/* 리뷰 작성 폼 */}
              {userId ? (
                <form
                  onSubmit={handleReviewSubmit}
                  className="glass-card rounded-2xl p-5 mb-6"
                >
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {existingReview ? "내 리뷰 수정" : "리뷰 작성"}
                  </p>
                  {/* 별점 */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setMyRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform duration-150 hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors duration-150 ${
                            star <= (hoverRating || myRating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      </button>
                    ))}
                    {myRating > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        {myRating}점
                      </span>
                    )}
                  </div>
                  <TextArea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="이 콘텐츠에 대한 의견을 남겨주세요..."
                    rows={3}
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      type="submit"
                      disabled={myRating === 0}
                      loading={reviewSubmitting}
                    >
                      {reviewSubmitting
                        ? "저장 중..."
                        : existingReview
                          ? "수정하기"
                          : "등록하기"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="glass rounded-2xl p-5 mb-6 text-center">
                  <p className="text-sm text-gray-500">
                    리뷰를 작성하려면{" "}
                    <button
                      onClick={() => router.push("/auth/login")}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      로그인
                    </button>
                    이 필요합니다
                  </p>
                </div>
              )}

              {/* 리뷰 목록 */}
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="glass-card rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">
                            {(review.profiles as unknown as Profile)?.name?.charAt(0) ?? "?"}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {(review.profiles as unknown as Profile)?.name ?? "익명"}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {(review.profiles as unknown as Profile)?.university}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                      {/* 별점 표시 */}
                      <div className="flex items-center gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 우측: 사이드바 */}
          <aside className="mt-8 lg:mt-0 space-y-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* 액션 버튼 */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <Button
                variant={bookmarked ? "danger" : "glass"}
                onClick={handleBookmark}
                disabled={!userId || bookmarkLoading}
                icon={<Heart className="w-4.5 h-4.5" fill={bookmarked ? "currentColor" : "none"} />}
                className={`w-full ${!userId ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {bookmarked ? "북마크 해제" : "북마크"}
              </Button>

              <Button
                variant="glass"
                onClick={handleShare}
                icon={<Share2 className="w-4.5 h-4.5" />}
                className="w-full"
              >
                {copied ? "링크 복사됨!" : "공유하기"}
              </Button>

              {isTemplate && content.file_url && (
                <a href={content.file_url} download onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="glass"
                    icon={<Download className="w-4.5 h-4.5" />}
                    className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  >
                    템플릿 다운로드
                  </Button>
                </a>
              )}

              <Button
                onClick={() => router.push("/tools/problem-designer")}
                icon={<Zap className="w-4.5 h-4.5" />}
                className="w-full"
              >
                내 수업에 적용
              </Button>
            </div>

            {/* 관련 콘텐츠 */}
            {relatedContents.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  관련 콘텐츠
                </h3>
                <div className="space-y-3">
                  {relatedContents.map((rc) => (
                    <ContentCard
                      key={rc.id}
                      content={rc}
                      isBookmarked={relatedBookmarks.has(rc.id)}
                      userId={userId}
                    />
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─── 스켈레톤 ──────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="aspect-video bg-gray-800" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 rounded-full w-16" />
              <Skeleton className="h-6 rounded-full w-12" />
              <Skeleton className="h-6 rounded-full w-14" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="mt-8 lg:mt-0 space-y-3">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
