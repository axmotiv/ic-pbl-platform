"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, User, FileText, LogOut, Menu, X } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { Profile } from "@/types/content";

/* ─── 네비게이션 아이템 ──────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  ready: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", ready: true },
  { href: "/contents", label: "콘텐츠", ready: true },
  { href: "/tools/problem-designer", label: "AI 도구", ready: true },
  { href: "/community", label: "커뮤니티", ready: false },
];

/* ─── 컴포넌트 ───────────────────────────────────── */

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  /* ─── 유저 & 프로필 로드 ─── */

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ─── 외부 클릭으로 드롭다운 닫기 ─── */

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ─── 스크롤 감지 ─── */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/auth/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const displayName = profile?.name || user?.email?.split("@")[0] || "";

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-white/80 backdrop-blur-2xl border-b border-white/30 shadow-md shadow-black/[0.03]"
        : "bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm"
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* ─── 로고 ─── */}
          <a href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
              <span className="text-white text-xs font-bold tracking-tight">IC</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent hidden sm:block">
              IC-PBL
            </span>
          </a>

          {/* ─── 중앙 내비게이션 (desktop) ─── */}
          <div className="hidden md:flex items-center gap-1 bg-white/40 backdrop-blur-sm rounded-2xl p-1 border border-white/30">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.ready ? item.href : undefined}
                onClick={
                  item.ready
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                      }
                }
                className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  !item.ready
                    ? "text-gray-300 cursor-default"
                    : isActive(item.href)
                      ? "text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                {item.label}
                {!item.ready && (
                  <span className="ml-1 text-[10px] bg-gray-100/80 text-gray-400 px-1.5 py-0.5 rounded-full">
                    준비중
                  </span>
                )}
              </a>
            ))}
          </div>

          {/* ─── 우측 액션 ─── */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-20 h-9 bg-white/40 rounded-xl animate-pulse" />
            ) : user ? (
              <>
                {/* 알림 아이콘 */}
                <button
                  className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-all duration-200"
                  title="알림"
                >
                  <Bell className="w-5 h-5" />
                </button>

                {/* 프로필 드롭다운 */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/60 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-md shadow-blue-500/20">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 glass-strong rounded-2xl shadow-xl py-1 z-50 animate-scale-in origin-top-right">
                      {/* 유저 정보 */}
                      <div className="px-4 py-3 border-b border-gray-100/50">
                        <p className="text-sm font-semibold text-gray-900">
                          {profile?.name || "사용자"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                        {profile?.university && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {profile.university} {profile.department}
                          </p>
                        )}
                      </div>

                      <a
                        href="/auth/profile-setup"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        프로필
                      </a>
                      <a
                        href="/tools/my-sessions"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-white/60 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        내 작업
                      </a>
                      <div className="border-t border-gray-100/50 mt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/60 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          로그아웃
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-200"
                >
                  로그인
                </a>
                <a
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  회원가입
                </a>
              </div>
            )}

            {/* ─── 모바일 햄버거 ─── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-white/60 rounded-xl transition-all duration-200"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 모바일 메뉴 ─── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 bg-white/70 backdrop-blur-xl animate-scale-in origin-top">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.ready ? item.href : undefined}
                onClick={() => {
                  if (item.ready) setMobileOpen(false);
                }}
                className={`block px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                  !item.ready
                    ? "text-gray-300 cursor-default"
                    : isActive(item.href)
                      ? "text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
                      : "text-gray-600 hover:bg-white/60"
                }`}
              >
                {item.label}
                {!item.ready && (
                  <span className="ml-1 text-[10px] bg-gray-100/80 text-gray-400 px-1.5 py-0.5 rounded-full">
                    준비중
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
