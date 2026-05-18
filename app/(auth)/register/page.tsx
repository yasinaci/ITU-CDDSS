"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    itu_student_id: "",
    email: "",
    password: ""
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password
    });

    if (signUpError) {
      setLoading(false);
      toast({ title: "Registration failed", description: signUpError.message, tone: "error" });
      return;
    }

    const { data: person, error: personError } = await supabase
      .from("person")
      .insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email
      })
      .select("person_id")
      .single();

    if (personError || !person) {
      setLoading(false);
      toast({
        title: "Could not create person record",
        description: personError?.message ?? "Check the person_insert_own RLS policy and email confirmation setting.",
        tone: "error"
      });
      return;
    }

    const { error: appUserError } = await supabase.from("app_user").insert({
      person_id: person.person_id,
      itu_student_id: form.itu_student_id || null,
      user_type: "student"
    });

    setLoading(false);

    if (appUserError) {
      toast({
        title: "Could not create app user",
        description: appUserError.message,
        tone: "error"
      });
      return;
    }

    toast({ title: "Account created", description: "Welcome to ITU CDDSS.", tone: "success" });
    router.push("/map");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-itu-navy font-semibold text-white">ITU</span>
            <span className="text-sm font-semibold text-itu-navy dark:text-slate-200">ITU CDDSS</span>
          </div>
          <CardTitle>Create student account</CardTitle>
          <CardDescription>Registration writes to Supabase Auth, person, and app_user.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" value={form.first_name} onChange={(event) => update("first_name", event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" value={form.last_name} onChange={(event) => update("last_name", event.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="itu_student_id">ITU student ID</Label>
              <Input id="itu_student_id" value={form.itu_student_id} onChange={(event) => update("itu_student_id", event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required />
            </div>
            <Button className="sm:col-span-2" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
            Already registered?{" "}
            <Link className="font-medium text-itu-navy dark:text-slate-200" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
