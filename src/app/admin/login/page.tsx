"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

const inputClass =
  "h-10 w-full rounded border border-line bg-surface/60 px-3 text-sm text-fg placeholder:text-faint focus:border-gold/60 focus:outline-none";
const labelClass = "block font-display text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Login failed");
        return;
      }
      router.push(params.get("from") || "/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Container className="flex min-h-[70vh] max-w-sm flex-col justify-center">
      <h1 className="mb-6 font-display text-xl font-bold uppercase tracking-[0.1em] text-fg">Admin sign in</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
        </div>
        {error ? <p className="text-xs text-loss">{error}</p> : null}
        <Button type="submit" disabled={pending || !password} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Container>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
