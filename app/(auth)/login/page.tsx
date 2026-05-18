"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { roleHome } from "@/lib/routing";
import type { AppUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, tone: "error" });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_user")
      .select("*, person!inner(first_name,last_name,email)")
      .eq("person.email", email)
      .maybeSingle();

    setLoading(false);

    if (profileError || !profile) {
      toast({
        title: "Profile not found",
        description: "Supabase Auth login worked, but this email is not linked in app_user/person.",
        tone: "error"
      });
      return;
    }

    const next = searchParams.get("next");
    router.push(next || roleHome((profile as AppUser).user_type));
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-itu-navy font-semibold text-white">ITU</span>
            <span className="text-sm font-semibold text-itu-navy dark:text-slate-200">ITU CDDSS</span>
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your ITU account registered in Supabase Auth.</CardDescription>
        </CardHeader>
        <CardContent>
          {searchParams.get("error") === "inactive" ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
              This account is inactive. Contact a system administrator.
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
            New student?{" "}
            <Link className="font-medium text-itu-navy dark:text-slate-200" href="/register">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
