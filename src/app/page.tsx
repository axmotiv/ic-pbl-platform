"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ContentCard from "@/components/ContentCard";
import type { Content, Profile } from "@/types/content";

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

/* ─── 페이지 ────────────────────────────────────── */

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const [recommended, setRecommended] = useState<Content[]>([]);
  const [recent, setRecent] = useState<Content[]>([]);
  const [popular, setPopular] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── 인증 체크 & 프로필 로드 ─── */

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
            setAuthChecked(true);
          });
        supabase
          .from("bookmarks")
          .select("content_id")
          .eq("user_id", user.id)
          .then(({ data }) => {
            if (data) setBookmarkedIds(new Set(data.map((b) => b.content_id)));
          });
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  /* ─── 콘텐츠 로드 ─── */

  useEffect(() => {
    if (!authChecked) return;

    const supabase = createClient();

    const fetchAll = async () => {
      // 추천 콘텐츠 (사용자 전공 기반, 없으면 전체)
      const recQuery = supabase
        .from("contents")
        .select("*")
        .eq("is_published", true)
        .order("average_rating", { ascending: false })
        .limit(4);

      if (profile?.department) {
        // academic_field가 매칭되면 우선
        const fieldKey = Object.entries(FIELD_LABELS).find(
          ([, v]) => profile.department?.includes(v)
        )?.[0];
        if (fieldKey) recQuery.eq("academic_field", fieldKey);
      }

      const [recRes, recentRes, popularRes] = await Promise.all([
        recQuery,
        supabase
          .from("contents")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("contents")
          .select("*")
          .eq("is_published", true)
          .order("view_count", { ascending: false })
          .limit(4),
      ]);

      if (recRes.data) setRecommended(recRes.data);
      if (recentRes.data) setRecent(recentRes.data);
      if (popularRes.data) setPopular(popularRes.data);
      setLoading(false);
    };

    fetchAll();
  }, [authChecked, profile]);

  /* ─── 로딩 중 ─── */

  if (!authChecked) {
    return <HomeSkeleton />;
  }

  /* ─── 비로그인: 랜딩 ─── */

  if (!userId) {
    return <LandingPage />;
  }

  /* ─── 로그인: 역할별 홈 ─── */

  const isProfessor = profile?.role === "professor" || profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ─── 환영 카드 ─── */}
        <WelcomeCard profile={profile} isProfessor={isProfessor} />

        {/* ─── 빠른 시작 ─── */}
        {isProfessor ? (
          <ProfessorQuickStart />
        ) : (
          <StudentQuickStart />
        )}

        {/* ─── 추천 콘텐츠 ─── */}
        <ContentSection
          title="추천 콘텐츠"
          contents={recommended}
          loading={loading}
          bookmarkedIds={bookmarkedIds}
          userId={userId}
          moreLink={
            profile?.department
              ? `/contents?field=${Object.entries(FIELD_LABELS).find(([, v]) => profile.department?.includes(v))?.[0] || ""}`
              : "/contents"
          }
        />

        {/* ─── 새로 올라온 콘텐츠 ─── */}
        <ContentSection
          title="새로 올라온 콘텐츠"
          contents={recent}
          loading={loading}
          bookmarkedIds={bookmarkedIds}
          userId={userId}
          moreLink="/contents"
        />

        {/* ─── 인기 콘텐츠 ─── */}
        <ContentSection
          title="인기 콘텐츠"
          contents={popular}
          loading={loading}
          bookmarkedIds={bookmarkedIds}
          userId={userId}
          moreLink="/contents"
        />
      </div>
    </div>
  );
}

/* ─── 환영 카드 ──────────────────────────────────── */

function WelcomeCard({
  profile,
  isProfessor,
}: {
  profile: Profile | null;
  isProfessor: boolean;
}) {
  const name = profile?.name || "사용자";

  return (
    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] rounded-2xl p-6 sm:p-8 text-white">
      <h1 className="text-xl sm:text-2xl font-bold">
        안녕하세요, {name}
        {isProfessor ? " 교수님" : "님"} 👋
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-blue-200">
        {profile?.university && <span>{profile.university}</span>}
        {profile?.department && (
          <>
            <span className="text-blue-300/50">|</span>
            <span>{profile.department}</span>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-blue-100 max-w-lg">
        {isProfessor
          ? "AI 도구와 다양한 콘텐츠로 효과적인 PBL 수업을 설계해보세요."
          : "PBL 학습에 도움이 되는 콘텐츠와 도구를 활용해보세요."}
      </p>
    </div>
  );
}

/* ─── 교수자 빠른 시작 ───────────────────────────── */

function ProfessorQuickStart() {
  const cards = [
    {
      href: "/tools/problem-designer",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "bg-violet-50 text-violet-600",
      title: "AI로 문제 설계하기",
      desc: "학습목표에 맞는 PBL 시나리오를 AI가 자동 생성",
    },
    {
      href: "/contents",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: "bg-blue-50 text-blue-600",
      title: "콘텐츠 탐색하기",
      desc: "PBL 설계·운영에 필요한 영상, 템플릿 모아보기",
    },
    {
      href: "/tools/my-sessions",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "bg-emerald-50 text-emerald-600",
      title: "내 작업 보기",
      desc: "AI로 생성한 문제 시나리오를 관리하고 수정",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3">빠른 시작</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
          >
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}
            >
              {card.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {card.desc}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── 학생 빠른 시작 ─────────────────────────────── */

function StudentQuickStart() {
  const cards = [
    {
      href: "/contents?difficulty=beginner",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: "bg-green-50 text-green-600",
      title: "PBL이 처음이라면",
      desc: "입문자를 위한 기초 콘텐츠 모음",
    },
    {
      href: "/contents?type=case_series",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "bg-purple-50 text-purple-600",
      title: "선배들의 PBL 이야기",
      desc: "실제 PBL 사례와 경험담 시리즈",
    },
    {
      href: "/contents?type=template",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      color: "bg-amber-50 text-amber-600",
      title: "바로 쓸 수 있는 도구",
      desc: "PBL 활동에 유용한 템플릿 모음",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3">
        PBL 학습 도우미
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition"
          >
            <div
              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}
            >
              {card.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {card.desc}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── 콘텐츠 섹션 ────────────────────────────────── */

function ContentSection({
  title,
  contents,
  loading,
  bookmarkedIds,
  userId,
  moreLink,
}: {
  title: string;
  contents: Content[];
  loading: boolean;
  bookmarkedIds: Set<string>;
  userId: string | null;
  moreLink: string;
}) {
  if (loading) {
    return (
      <div>
        <div className="h-6 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (contents.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <a
          href={moreLink}
          className="text-sm text-gray-500 hover:text-blue-600 transition flex items-center gap-1"
        >
          더보기
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {contents.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            isBookmarked={bookmarkedIds.has(content.id)}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── 랜딩 페이지 (비로그인) ─────────────────────── */

function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-sm px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            AI 기반 PBL 교육 플랫폼
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            대학 PBL 교육의
            <br />
            새로운 기준
          </h1>
          <p className="mt-5 text-base sm:text-lg text-blue-200 max-w-xl mx-auto leading-relaxed">
            AI 문제설계 어시스턴트와 큐레이팅된 콘텐츠로
            <br className="hidden sm:block" />
            효과적인 PBL 수업을 설계하세요
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <a
              href="/auth/signup"
              className="px-7 py-3.5 bg-white text-[#1e3a5f] font-semibold rounded-xl text-sm hover:bg-gray-100 transition shadow-lg shadow-black/10"
            >
              무료로 시작하기
            </a>
            <a
              href="/contents"
              className="px-7 py-3.5 bg-white/10 text-white font-medium rounded-xl text-sm hover:bg-white/20 transition backdrop-blur-sm border border-white/20"
            >
              콘텐츠 둘러보기
            </a>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">
          왜 IC-PBL인가요?
        </h2>
        <p className="text-center text-gray-500 mb-12 max-w-md mx-auto">
          PBL 교육에 필요한 모든 것을 한 곳에서 제공합니다
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              color: "bg-violet-100 text-violet-600",
              title: "AI 문제 설계",
              desc: "학습목표만 입력하면 AI가 PBL 문제 시나리오를 자동으로 설계합니다. 산업체 연계형, 지역사회형 등 다양한 유형을 지원합니다.",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: "bg-blue-100 text-blue-600",
              title: "큐레이팅 콘텐츠",
              desc: "PBL 설계·운영·평가에 필요한 숏폼 영상, 심화 강의, 사례 시리즈, 템플릿을 제공합니다.",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              color: "bg-emerald-100 text-emerald-600",
              title: "교수자 커뮤니티",
              desc: "PBL 교육 경험을 공유하고, 함께 성장하는 교수자 네트워크에 참여하세요. (준비 중)",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            무료 회원가입 후 AI 문제설계 도구와 모든 콘텐츠를 이용할 수 있습니다
          </p>
          <a
            href="/auth/signup"
            className="inline-block px-8 py-3.5 bg-[#1e3a5f] text-white font-semibold rounded-xl text-sm hover:bg-[#16304f] transition"
          >
            무료로 시작하기
          </a>
        </div>
      </section>
    </div>
  );
}

/* ─── 스켈레톤 ───────────────────────────────────── */

function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* 환영 카드 스켈레톤 */}
        <div className="bg-gray-200 rounded-2xl h-40 animate-pulse" />
        {/* 빠른 시작 스켈레톤 */}
        <div>
          <div className="h-6 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
        {/* 콘텐츠 섹션 스켈레톤 */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="h-6 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <SkeletonCard key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-gray-100 rounded-full w-14" />
          <div className="h-5 bg-gray-100 rounded-full w-10" />
        </div>
      </div>
    </div>
  );
}
