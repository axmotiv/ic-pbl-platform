"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { value: "professor", label: "교수자" },
  { value: "student", label: "학생" },
  { value: "admin", label: "운영자" },
] as const;

const PBL_LEVELS = [
  { value: "beginner", label: "처음" },
  { value: "intermediate", label: "1-2학기" },
  { value: "advanced", label: "3학기 이상" },
] as const;

const INTEREST_OPTIONS = [
  "PBL 수업설계",
  "QBL",
  "퍼실리테이션",
  "팀운영",
  "평가",
  "Active Learning",
] as const;

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [pblLevel, setPblLevel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/signup");
        return;
      }

      setCheckingAuth(false);
    };

    checkUser();
  }, [router]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !role || !university.trim() || !department.trim() || !pblLevel) {
      setError("모든 필수 항목을 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("인증 정보를 찾을 수 없습니다");
        return;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        name,
        role,
        university,
        department,
        pbl_level: pblLevel,
        interests,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      router.push("/");
    } catch {
      setError("프로필 저장 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>
            <p className="text-gray-500 mt-2 text-sm">
              프로필 정보를 입력하여 가입을 완료하세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
              />
            </div>

            {/* 역할 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                역할 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex-1 text-center py-3 rounded-xl border text-sm font-medium cursor-pointer transition ${
                      role === r.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={(e) => setRole(e.target.value)}
                      className="sr-only"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 소속 대학 */}
            <div>
              <label
                htmlFor="university"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                소속 대학 <span className="text-red-500">*</span>
              </label>
              <input
                id="university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="소속 대학을 입력하세요"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
              />
            </div>

            {/* 전공/학과 */}
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                전공/학과 <span className="text-red-500">*</span>
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="전공 또는 학과를 입력하세요"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
              />
            </div>

            {/* PBL 경험 수준 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                PBL 경험 수준 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {PBL_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`flex-1 text-center py-3 rounded-xl border text-sm font-medium cursor-pointer transition ${
                      pblLevel === level.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pblLevel"
                      value={level.value}
                      checked={pblLevel === level.value}
                      onChange={(e) => setPblLevel(e.target.value)}
                      className="sr-only"
                    />
                    {level.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 관심 분야 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                관심 분야 <span className="text-gray-400">(다중 선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                      interests.includes(interest)
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "가입 완료"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
