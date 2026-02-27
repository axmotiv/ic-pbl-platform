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
      const recQuery = supabase
        .from("contents")
        .select("*")
        .eq("is_published", true)
        .order("average_rating", { ascending: false })
        .limit(4);

      if (profile?.department) {
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
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
    <div className="relative overflow-hidden rounded-3xl p-7 sm:p-9 animate-fade-in">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600" />
      {/* 장식 요소 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />

      <div className="relative z-10">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          안녕하세요, {name}
          {isProfessor ? " 교수님" : "님"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-blue-200/80">
          {profile?.university && <span>{profile.university}</span>}
          {profile?.department && (
            <>
              <span className="text-blue-300/30">|</span>
              <span>{profile.department}</span>
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-blue-100/80 max-w-lg">
          {isProfessor
            ? "AI 도구와 다양한 콘텐츠로 효과적인 PBL 수업을 설계해보세요."
            : "PBL 학습에 도움이 되는 콘텐츠와 도구를 활용해보세요."}
        </p>
      </div>
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
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/25",
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
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/25",
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
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      title: "내 작업 보기",
      desc: "AI로 생성한 문제 시나리오를 관리하고 수정",
    },
  ];

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 시작</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg ${card.shadow} mb-4`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {card.desc}
            </p>
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
      gradient: "from-green-500 to-emerald-500",
      shadow: "shadow-green-500/25",
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
      gradient: "from-purple-500 to-violet-500",
      shadow: "shadow-purple-500/25",
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
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/25",
      title: "바로 쓸 수 있는 도구",
      desc: "PBL 활동에 유용한 템플릿 모음",
    },
  ];

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">PBL 학습 도우미</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group glass-card rounded-2xl p-5 hover:-translate-y-1 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg ${card.shadow} mb-4`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {card.desc}
            </p>
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
        <div className="h-6 bg-white/40 rounded-lg w-32 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (contents.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <a
          href={moreLink}
          className="text-sm text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 group"
        >
          더보기
          <svg
            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    <div className="min-h-[calc(100vh-64px)]">
      {/* 히어로 */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
        {/* 장식 블롭 */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-sm px-5 py-2 rounded-full mb-8 backdrop-blur-sm border border-white/10 animate-fade-in">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            AI 기반 PBL 교육 플랫폼
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            대학 PBL 교육의
            <br />
            <span className="bg-gradient-to-r from-blue-200 to-violet-200 bg-clip-text text-transparent">
              새로운 기준
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-blue-200/80 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            AI 문제설계 어시스턴트와 큐레이팅된 콘텐츠로
            <br className="hidden sm:block" />
            효과적인 PBL 수업을 설계하세요
          </p>
          <div className="flex items-center justify-center gap-4 mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <a
              href="/auth/signup"
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all duration-300 shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5"
            >
              무료로 시작하기
            </a>
            <a
              href="/contents"
              className="px-8 py-4 bg-white/10 text-white font-medium rounded-2xl text-sm hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20"
            >
              콘텐츠 둘러보기
            </a>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">
          왜 IC-PBL인가요?
        </h2>
        <p className="text-center text-gray-500 mb-14 max-w-md mx-auto">
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
              gradient: "from-violet-500 to-purple-600",
              shadow: "shadow-violet-500/20",
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
              gradient: "from-blue-500 to-cyan-500",
              shadow: "shadow-blue-500/20",
              title: "큐레이팅 콘텐츠",
              desc: "PBL 설계·운영·평가에 필요한 숏폼 영상, 심화 강의, 사례 시리즈, 템플릿을 제공합니다.",
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
              gradient: "from-emerald-500 to-teal-500",
              shadow: "shadow-emerald-500/20",
              title: "교수자 커뮤니티",
              desc: "PBL 교육 경험을 공유하고, 함께 성장하는 교수자 네트워크에 참여하세요. (준비 중)",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="glass-card rounded-3xl p-7 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-lg ${feature.shadow} mb-5`}
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA3KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-200/80 mb-8 max-w-md mx-auto">
            무료 회원가입 후 AI 문제설계 도구와 모든 콘텐츠를 이용할 수 있습니다
          </p>
          <a
            href="/auth/signup"
            className="inline-block px-10 py-4 bg-white text-indigo-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all duration-300 shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5"
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
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* 환영 카드 스켈레톤 */}
        <div className="glass-card rounded-3xl h-40 animate-pulse" />
        {/* 빠른 시작 스켈레톤 */}
        <div>
          <div className="h-6 bg-white/40 rounded-lg w-24 mb-4 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        {/* 콘텐츠 섹션 스켈레톤 */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="h-6 bg-white/40 rounded-lg w-32 mb-4 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    <div className="glass-card rounded-3xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/30" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/40 rounded-lg w-3/4" />
        <div className="h-3 bg-white/30 rounded-lg w-1/2" />
        <div className="flex gap-2">
          <div className="h-5 bg-white/30 rounded-full w-14" />
          <div className="h-5 bg-white/30 rounded-full w-10" />
        </div>
      </div>
    </div>
  );
}
