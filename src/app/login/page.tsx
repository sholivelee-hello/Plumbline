"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-card shadow-card p-8">
        <h1 className="text-2xl font-bold text-warm-700 text-center mb-2">
          Plumbline
        </h1>
        <p className="text-warm-400 text-center text-sm mb-8">
          나의 하루를 세우는 다림줄
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-warm-300"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-warm-500 text-white font-medium hover:bg-warm-600 transition-colors"
          >
            {isSignUp ? "회원가입" : "로그인"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-4 text-sm text-warm-400 hover:text-warm-600"
        >
          {isSignUp ? "이미 계정이 있어요" : "계정 만들기"}
        </button>
      </div>
    </div>
  );
}
