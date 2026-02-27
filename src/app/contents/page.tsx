"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, X } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import Button from "@/components/ui/Button";
import { FilterRow } from "@/components/ui/FilterPill";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import type { Content } from "@/types/content";

const PAGE_SIZE = 12;

const TYPE_FILTERS = [
  { value: "", label: "전체" },
  { value: "short_video", label: "숏폼영상" },
  { value: "deep_dive", label: "심화강의" },
  { value: "template", label: "템플릿" },
  { value: "case_series", label: "사례시리즈" },
];

const SUBJECT_FILTERS = [
  { value: "", label: "전체" },
  { value: "pbl_design", label: "PBL설계" },
  { value: "qbl", label: "QBL" },
  { value: "facilitation", label: "퍼실리테이션" },
  { value: "team", label: "팀운영" },
  { value: "assessment", label: "평가" },
];

const DIFFICULTY_FILTERS = [
  { value: "", label: "전체" },
  { value: "beginner", label: "입문" },
  { value: "intermediate", label: "실천" },
  { value: "advanced", label: "심화" },
];

export default function ContentsPage() {
  return (
    <Suspense fallback={<ContentsPageSkeleton />}>
      <ContentsPageInner />
    </Suspense>
  );
}

function ContentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "";
  const currentSubject = searchParams.get("subject") ?? "";
  const currentDifficulty = searchParams.get("difficulty") ?? "";
  const currentSearch = searchParams.get("q") ?? "";

  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/contents?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("q", searchInput.trim());
  };

  const fetchContents = useCallback(
    async (page: number, append = false) => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      const supabase = createClient();
      let query = supabase
        .from("contents")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (currentType) query = query.eq("type", currentType);
      if (currentSubject) query = query.eq("subject_area", currentSubject);
      if (currentDifficulty) query = query.eq("difficulty", currentDifficulty);
      if (currentSearch) query = query.ilike("title", `%${currentSearch}%`);

      const { data, error } = await query;

      if (!error && data) {
        if (append) {
          setContents((prev) => [...prev, ...data]);
        } else {
          setContents(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [currentType, currentSubject, currentDifficulty, currentSearch]
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("bookmarks")
          .select("content_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) {
              setBookmarkedIds(new Set(data.map((b) => b.content_id)));
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    pageRef.current = 0;
    fetchContents(0);
  }, [fetchContents]);

  const handleLoadMore = () => {
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchContents(nextPage, true);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900">콘텐츠 허브</h1>
          <p className="text-sm text-gray-500 mt-2">
            PBL 교수법에 대한 다양한 콘텐츠를 탐색하세요
          </p>
        </div>

        {/* 검색바 */}
        <form onSubmit={handleSearch} className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="콘텐츠 검색..."
              className="w-full pl-12 pr-4 py-3.5 glass-strong rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 placeholder:text-gray-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); updateFilter("q", ""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* 필터 바 */}
        <div className="space-y-3 mb-10 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <FilterRow label="유형" options={TYPE_FILTERS} value={currentType} onChange={(v) => updateFilter("type", v)} />
          <FilterRow label="주제" options={SUBJECT_FILTERS} value={currentSubject} onChange={(v) => updateFilter("subject", v)} />
          <FilterRow label="난이도" options={DIFFICULTY_FILTERS} value={currentDifficulty} onChange={(v) => updateFilter("difficulty", v)} />
        </div>

        {/* 콘텐츠 그리드 */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-500">아직 콘텐츠가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">새로운 콘텐츠가 곧 등록될 예정이에요</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {contents.map((content) => (
                <ContentCard key={content.id} content={content} isBookmarked={bookmarkedIds.has(content.id)} userId={userId} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-12">
                <Button variant="glass" size="lg" loading={loadingMore} onClick={handleLoadMore}>
                  {loadingMore ? "불러오는 중..." : "더보기"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContentsPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-14 rounded-2xl mb-6" />
        <div className="space-y-3 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-10" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-8 rounded-full w-16" />)}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
