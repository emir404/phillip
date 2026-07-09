"use client";

import { MotionProvider } from "@/components/motion-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { container, item } from "@/motion";
import { CircleNotch } from "@phosphor-icons/react";
import { m, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion() ?? false;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setError(err.message ?? "sign-in failed");
      setPending(false);
      return;
    }
    router.push(params.get("next") ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm rounded-2xl">
      <m.div className="contents" variants={container(reduce)} initial="initial" animate="animate">
        <CardHeader>
          <m.div variants={item(reduce)}>
            <span
              className="mb-3 flex size-10 items-center justify-center rounded-xl text-base font-semibold text-white [background:var(--gradient-brand)]"
              aria-hidden
            >
              p
            </span>
          </m.div>
          <m.div variants={item(reduce)}>
            <CardTitle className="flex items-baseline gap-1.5">
              <span className="font-semibold tracking-tight">phillip</span>
              <span className="font-normal text-muted-foreground">· nutz</span>
            </CardTitle>
            <CardDescription className="mt-1">Sign in to the team dashboard.</CardDescription>
          </m.div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <m.div className="grid gap-1.5" variants={item(reduce)}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </m.div>
            <m.div className="grid gap-1.5" variants={item(reduce)}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </m.div>
            {error ? (
              <m.p
                className="text-sm text-destructive"
                variants={item(reduce)}
                initial="initial"
                animate="animate"
                role="alert"
              >
                {error}
              </m.p>
            ) : null}
            <m.div variants={item(reduce)}>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? (
                  <>
                    <span data-icon="inline-start" className="inline-flex animate-spin" aria-hidden>
                      <CircleNotch />
                    </span>
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </m.div>
          </form>
        </CardContent>
      </m.div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_at_50%_18%,oklch(0.585_0.198_252.4/0.08),transparent)] dark:bg-[radial-gradient(600px_at_50%_18%,oklch(0.623_0.19_252/0.1),transparent)]"
      />
      <MotionProvider>
        <Suspense>
          <LoginForm />
        </Suspense>
      </MotionProvider>
    </main>
  );
}
