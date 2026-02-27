"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message === "Invalid login credentials") {
          setError("이메일 또는 비밀번호가 올바르지 않습니다");
        } else if (signInError.message === "Email not confirmed") {
          setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요");
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 -z-10" />
      {/* 장식 블롭 */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-blob -z-10" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-violet-400/15 rounded-full blur-3xl animate-blob -z-10" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md animate-fade-in">
        <div className="glass-strong rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            {/* 로고 */}
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
              <span className="text-white text-lg font-bold">IC</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
            <p className="text-gray-500 mt-2 text-sm">
              PBL 커뮤니티에 오신 것을 환영합니다
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
                placeholder="이메일을 입력하세요"
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
                placeholder="비밀번호를 입력하세요"
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
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <a
              href="/auth/reset-password"
              className="block text-sm text-gray-500 hover:text-blue-600 transition"
            >
              비밀번호를 잊으셨나요?
            </a>
            <p className="text-sm text-gray-500">
              아직 계정이 없으신가요?{" "}
              <a
                href="/auth/signup"
                className="text-blue-600 font-medium hover:underline"
              >
                회원가입
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
