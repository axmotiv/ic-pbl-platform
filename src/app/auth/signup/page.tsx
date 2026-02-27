"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function isUniversityEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return lower.endsWith(".ac.kr") || lower.endsWith(".edu");
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isUniversityEmail(email)) {
      setError("대학 이메일만 가입 가능합니다");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError("회원가입 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 -z-10" />
      {/* 장식 블롭 */}
      <div className="fixed top-20 right-10 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl animate-blob -z-10" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-blob -z-10" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-strong rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            {/* 로고 */}
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-white text-lg font-bold">IC</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
            <p className="text-gray-500 mt-2 text-sm">
              대학 이메일로 가입하고 PBL 커뮤니티에 참여하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="대학 이메일을 입력하세요 (예: abc@university.ac.kr)"
                required
                className="w-full px-4 py-3 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm placeholder:text-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상 입력해주세요"
                required
                className="w-full px-4 py-3 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm placeholder:text-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력해주세요"
                required
                className="w-full px-4 py-3 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition backdrop-blur-sm placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="bg-red-50/80 text-red-600 text-sm px-4 py-3 rounded-xl backdrop-blur-sm border border-red-100/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : "인증 메일 발송"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            이미 계정이 있으신가요?{" "}
            <a
              href="/auth/login"
              className="text-blue-600 font-medium hover:underline"
            >
              로그인
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
