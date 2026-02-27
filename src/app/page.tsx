"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Zap, Archive, FileText, BookOpen, Users, LayoutTemplate, ChevronRight, Sparkles } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { FIELD_LABELS } from "@/lib/constants/labels";
import type { Content, Profile } from "@/types/content";

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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => { if (data) setProfile(data); setAuthChecked(true); });
        supabase.from("bookmarks").select("content_id").eq("user_id", user.id).then(({ data }) => { if (data) setBookmarkedIds(new Set(data.map((b) => b.content_id))); });
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const supabase = createClient();
    const fetchAll = async () => {
      const recQuery = supabase.from("contents").select("*").eq("is_published", true).order("average_rating", { ascending: false }).limit(4);
      if (profile?.department) {
        const fieldKey = Object.entries(FIELD_LABELS).find(([, v]) => profile.department?.includes(v))?.[0];
        if (fieldKey) recQuery.eq("academic_field", fieldKey);
      }
      const [recRes, recentRes, popularRes] = await Promise.all([
        recQuery,
        supabase.from("contents").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("contents").select("*").eq("is_published", true).order("view_count", { ascending: false }).limit(4),
      ]);
      if (recRes.data) setRecommended(recRes.data);
      if (recentRes.data) setRecent(recentRes.data);
      if (popularRes.data) setPopular(popularRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [authChecked, profile]);

  if (!authChecked) return <HomeSkeleton />;
  if (!userId) return <LandingPage />;

  const isProfessor = profile?.role === "professor" || profile?.role === "admin";

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <WelcomeCard profile={profile} isProfessor={isProfessor} />
        {isProfessor ? <ProfessorQuickStart /> : <StudentQuickStart />}
        <ContentSection title="추천 콘텐츠" contents={recommended} loading={loading} bookmarkedIds={bookmarkedIds} userId={userId}
          moreLink={profile?.department ? `/contents?field=${Object.entries(FIELD_LABELS).find(([, v]) => profile.department?.includes(v))?.[0] || ""}` : "/contents"} />
        <ContentSection title="새로 올라온 콘텐츠" contents={recent} loading={loading} bookmarkedIds={bookmarkedIds} userId={userId} moreLink="/contents" />
        <ContentSection title="인기 콘텐츠" contents={popular} loading={loading} bookmarkedIds={bookmarkedIds} userId={userId} moreLink="/contents" />
      </div>
    </div>
  );
}

/* ─── 환영 카드 ──────────────────────────────────── */

function WelcomeCard({ profile, isProfessor }: { profile: Profile | null; isProfessor: boolean }) {
  const name = profile?.name || "사용자";
  return (
    <div className="relative overflow-hidden rounded-3xl p-7 sm:p-9 animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 animate-gradient-shift" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-violet-300/15 rounded-full blur-3xl animate-float" />
      <div className="relative z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          안녕하세요, {name}{isProfessor ? " 교수님" : "님"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-blue-200/80">
          {profile?.university && <span>{profile.university}</span>}
          {profile?.department && <><span className="text-blue-300/30">|</span><span>{profile.department}</span></>}
        </div>
        <p className="mt-3 text-sm text-blue-100/80 max-w-lg leading-relaxed">
          {isProfessor ? "AI 도구와 다양한 콘텐츠로 효과적인 PBL 수업을 설계해보세요." : "PBL 학습에 도움이 되는 콘텐츠와 도구를 활용해보세요."}
        </p>
      </div>
    </div>
  );
}

/* ─── 빠른 시작 카드 ─────────────────────────────── */

interface QuickCard { href: string; icon: React.ReactNode; gradient: string; shadow: string; title: string; desc: string; }

function QuickStartGrid({ title, cards }: { title: string; cards: QuickCard[] }) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <a key={card.href} href={card.href} className="group">
            <GlassCard variant="card" hoverable className="p-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg ${card.shadow} mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                {card.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{card.title}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.desc}</p>
            </GlassCard>
          </a>
        ))}
      </div>
    </div>
  );
}

function ProfessorQuickStart() {
  return (
    <QuickStartGrid title="빠른 시작" cards={[
      { href: "/tools/problem-designer", icon: <Zap className="w-6 h-6" />, gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/25", title: "AI로 문제 설계하기", desc: "학습목표에 맞는 PBL 시나리오를 AI가 자동 생성" },
      { href: "/contents", icon: <Archive className="w-6 h-6" />, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/25", title: "콘텐츠 탐색하기", desc: "PBL 설계·운영에 필요한 영상, 템플릿 모아보기" },
      { href: "/tools/my-sessions", icon: <FileText className="w-6 h-6" />, gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/25", title: "내 작업 보기", desc: "AI로 생성한 문제 시나리오를 관리하고 수정" },
    ]} />
  );
}

function StudentQuickStart() {
  return (
    <QuickStartGrid title="PBL 학습 도우미" cards={[
      { href: "/contents?difficulty=beginner", icon: <BookOpen className="w-6 h-6" />, gradient: "from-green-500 to-emerald-500", shadow: "shadow-green-500/25", title: "PBL이 처음이라면", desc: "입문자를 위한 기초 콘텐츠 모음" },
      { href: "/contents?type=case_series", icon: <Users className="w-6 h-6" />, gradient: "from-purple-500 to-violet-500", shadow: "shadow-purple-500/25", title: "선배들의 PBL 이야기", desc: "실제 PBL 사례와 경험담 시리즈" },
      { href: "/contents?type=template", icon: <LayoutTemplate className="w-6 h-6" />, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/25", title: "바로 쓸 수 있는 도구", desc: "PBL 활동에 유용한 템플릿 모음" },
    ]} />
  );
}

/* ─── 콘텐츠 섹션 ────────────────────────────────── */

function ContentSection({ title, contents, loading, bookmarkedIds, userId, moreLink }: {
  title: string; contents: Content[]; loading: boolean; bookmarkedIds: Set<string>; userId: string | null; moreLink: string;
}) {
  if (loading) {
    return (
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (contents.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <a href={moreLink} className="text-sm text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 group">
          더보기
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {contents.map((content) => <ContentCard key={content.id} content={content} isBookmarked={bookmarkedIds.has(content.id)} userId={userId} />)}
      </div>
    </div>
  );
}

/* ─── 랜딩 페이지 ────────────────────────────────── */

function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 animate-gradient-shift" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-violet-400/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl animate-float" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-28 sm:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-sm px-5 py-2 rounded-full mb-8 backdrop-blur-sm border border-white/15 animate-fade-in hover:bg-white/15 transition-colors duration-300">
            <Sparkles className="w-4 h-4" />
            AI 기반 PBL 교육 플랫폼
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.1] tracking-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
            대학 PBL 교육의<br />
            <span className="bg-gradient-to-r from-blue-200 via-violet-200 to-purple-200 bg-clip-text text-transparent">새로운 기준</span>
          </h1>
          <p className="mt-7 text-base sm:text-lg text-blue-200/80 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: "0.2s" }}>
            AI 문제설계 어시스턴트와 큐레이팅된 콘텐츠로<br className="hidden sm:block" />
            효과적인 PBL 수업을 설계하세요
          </p>
          <div className="flex items-center justify-center gap-4 mt-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <a href="/auth/signup" className="px-9 py-4 bg-white text-indigo-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all duration-300 shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]">
              무료로 시작하기
            </a>
            <a href="/contents" className="px-9 py-4 bg-white/10 text-white font-medium rounded-2xl text-sm hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 hover:-translate-y-0.5">
              콘텐츠 둘러보기
            </a>
          </div>
        </div>
      </section>

      {/* 피처 섹션 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-28">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-900 mb-3 tracking-tight">왜 IC-PBL인가요?</h2>
        <p className="text-center text-gray-500 mb-16 max-w-md mx-auto">PBL 교육에 필요한 모든 것을 한 곳에서 제공합니다</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="w-7 h-7" />, gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", title: "AI 문제 설계", desc: "학습목표만 입력하면 AI가 PBL 문제 시나리오를 자동으로 설계합니다. 산업체 연계형, 지역사회형 등 다양한 유형을 지원합니다." },
            { icon: <Archive className="w-7 h-7" />, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20", title: "큐레이팅 콘텐츠", desc: "PBL 설계·운영·평가에 필요한 숏폼 영상, 심화 강의, 사례 시리즈, 템플릿을 제공합니다." },
            { icon: <Users className="w-7 h-7" />, gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20", title: "교수자 커뮤니티", desc: "PBL 교육 경험을 공유하고, 함께 성장하는 교수자 네트워크에 참여하세요. (준비 중)" },
          ].map((feature) => (
            <GlassCard key={feature.title} variant="card" hoverable className="rounded-3xl p-7 group">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-lg ${feature.shadow} mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-gradient-shift" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA3KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">지금 바로 시작하세요</h2>
          <p className="text-blue-200/80 mb-10 max-w-md mx-auto">무료 회원가입 후 AI 문제설계 도구와 모든 콘텐츠를 이용할 수 있습니다</p>
          <a href="/auth/signup" className="inline-block px-10 py-4 bg-white text-indigo-600 font-semibold rounded-2xl text-sm hover:bg-gray-50 transition-all duration-300 shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98]">
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
        <Skeleton className="h-40 rounded-3xl" />
        <div>
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, j) => <SkeletonCard key={j} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
