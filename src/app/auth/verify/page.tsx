"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setResent(true);
    } catch {
      setError("재발송 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        인증 메일을 보냈습니다
      </h1>
      <p className="text-gray-500 text-sm mb-2">이메일을 확인해주세요.</p>
      {email && (
        <p className="text-blue-600 font-medium text-sm mb-6">{email}</p>
      )}
      <p className="text-gray-400 text-xs mb-8">
        메일함에서 인증 링크를 클릭하면 가입이 완료됩니다.
        <br />
        메일이 보이지 않으면 스팸함을 확인해주세요.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {resent && (
        <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
          인증 메일을 다시 보냈습니다
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={loading}
        className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "발송 중..." : "인증 메일 재발송"}
      </button>

      <a
        href="/auth/signup"
        className="inline-block mt-4 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        다른 이메일로 가입하기
      </a>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
              로딩 중...
            </div>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
