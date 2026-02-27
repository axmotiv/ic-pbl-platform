"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ContentCard from "@/components/ContentCard";
import type { Content, Profile, Review } from "@/types/content";

/* ─── 라벨 매핑 ─────────────────────────────────── */

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  short_video: { label: "숏폼영상", color: "bg-rose-500" },
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

const PBL_STAGE_LABELS: Record<string, string> = {
  problem_design: "문제설계",
  facilitation: "퍼실리테이션",
  team_management: "팀운영",
  assessment: "평가",
  reflection: "성찰",
};

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

    // 콘텐츠 가져오기
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

    // 작성자 프로필
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", contentData.author_id)
      .single();
    if (profileData) setAuthor(profileData);

    // 현재 유저 & 북마크
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

      // 기존 리뷰 확인
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

    // 시리즈 에피소드
    if (contentData.series_id) {
      const { data: episodes } = await supabase
        .from("contents")
        .select("*")
        .eq("series_id", contentData.series_id)
        .eq("is_published", true)
        .order("episode_number", { ascending: true });
      if (episodes) setSeriesEpisodes(episodes);
    }

    // 리뷰 목록
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*, profiles(id, name, university)")
      .eq("content_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (reviewsData) setReviews(reviewsData as Review[]);

    // 관련 콘텐츠 (같은 주제 or 난이도, 자기 자신 제외)
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

    // 조회수 증가 (한 번만)
    if (!viewIncremented.current) {
      viewIncremented.current = true;
      await supabase.rpc("increment_view_count", { content_id: id });
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 북마크 토글
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

  // 링크 복사
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 리뷰 제출
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

    // 리뷰 목록 갱신
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-gray-500">
          콘텐츠를 찾을 수 없습니다
        </p>
        <button
          onClick={() => router.push("/contents")}
          className="text-sm text-blue-600 hover:underline"
        >
          콘텐츠 허브로 돌아가기
        </button>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[content.type] ?? {
    label: content.type,
    color: "bg-gray-500",
  };
  const subjectLabel =
    SUBJECT_LABELS[content.subject_area] ?? content.subject_area;
  const difficultyConfig = DIFFICULTY_CONFIG[content.difficulty] ?? {
    label: content.difficulty,
    color: "bg-gray-100 text-gray-700",
  };
  const pblStageLabel =
    PBL_STAGE_LABELS[content.pbl_stage] ?? content.pbl_stage;
  const isVideo =
    content.video_url && content.video_platform;
  const isTemplate = content.type === "template";

  return (
    <div className="min-h-screen bg-gray-50">
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
            <section>
              {/* 유형 뱃지 */}
              <span
                className={`inline-block px-3 py-1 text-xs font-semibold text-white rounded-lg mb-3 ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {content.title}
              </h1>

              {/* 작성자 정보 */}
              {author && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm shrink-0">
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
                  <EyeIcon />
                  조회 {content.view_count.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <StarIconSmall />
                  {content.average_rating > 0
                    ? `${content.average_rating.toFixed(1)}점`
                    : "평가 없음"}
                </span>
                {content.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <ClockIcon />
                    {content.duration_minutes}분
                  </span>
                )}
              </div>

              {/* 태그들 */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                  {subjectLabel}
                </span>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${difficultyConfig.color}`}
                >
                  {difficultyConfig.label}
                </span>
                {content.pbl_stage && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {pblStageLabel}
                  </span>
                )}
              </div>
            </section>

            {/* 설명 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                소개
              </h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {content.description}
              </div>
            </section>

            {/* 시리즈 에피소드 */}
            {seriesEpisodes.length > 1 && (
              <section>
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
                        className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition ${
                          isCurrent
                            ? "bg-blue-50 border-2 border-blue-200"
                            : "bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isCurrent
                              ? "bg-blue-600 text-white"
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
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                리뷰
              </h2>

              {/* 리뷰 작성 폼 */}
              {userId ? (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-white rounded-xl border border-gray-200 p-5 mb-6"
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
                        className="p-0.5"
                      >
                        <svg
                          className={`w-7 h-7 transition-colors ${
                            star <= (hoverRating || myRating)
                              ? "text-yellow-400"
                              : "text-gray-200"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    {myRating > 0 && (
                      <span className="text-sm text-gray-500 ml-2">
                        {myRating}점
                      </span>
                    )}
                  </div>
                  {/* 텍스트 */}
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="이 콘텐츠에 대한 의견을 남겨주세요..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={myRating === 0 || reviewSubmitting}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewSubmitting
                        ? "저장 중..."
                        : existingReview
                          ? "수정하기"
                          : "등록하기"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-50 rounded-xl p-5 mb-6 text-center">
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
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center text-xs font-semibold">
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
                          {new Date(review.created_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </span>
                      </div>
                      {/* 별점 표시 */}
                      <div className="flex items-center gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? "text-yellow-400"
                                : "text-gray-200"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
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

          {/* 우측: 사이드바 (액션 + 관련 콘텐츠) */}
          <aside className="mt-8 lg:mt-0 space-y-6">
            {/* 액션 버튼 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              {/* 북마크 */}
              <button
                onClick={handleBookmark}
                disabled={!userId || bookmarkLoading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  bookmarked
                    ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                } ${!userId ? "opacity-50 cursor-not-allowed" : ""}`}
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
                {bookmarked ? "북마크 해제" : "북마크"}
              </button>

              {/* 공유 */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition"
              >
                <svg
                  className="w-4.5 h-4.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                {copied ? "링크 복사됨!" : "공유하기"}
              </button>

              {/* 템플릿 다운로드 */}
              {isTemplate && content.file_url && (
                <a
                  href={content.file_url}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  <svg
                    className="w-4.5 h-4.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  템플릿 다운로드
                </a>
              )}

              {/* 내 수업에 적용 */}
              <button
                onClick={() => router.push("/ai-design")}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <svg
                  className="w-4.5 h-4.5"
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
                내 수업에 적용
              </button>
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

/* ─── 아이콘 컴포넌트 ───────────────────────────── */

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function StarIconSmall() {
  return (
    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/* ─── 스켈레톤 ──────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="aspect-video bg-gray-800" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded-full w-16" />
              <div className="h-6 bg-gray-200 rounded-full w-12" />
              <div className="h-6 bg-gray-200 rounded-full w-14" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
          <div className="mt-8 lg:mt-0 space-y-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="h-10 bg-gray-200 rounded-xl" />
              <div className="h-10 bg-gray-200 rounded-xl" />
              <div className="h-10 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
