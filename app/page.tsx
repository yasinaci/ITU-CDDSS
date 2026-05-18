import { redirect } from "next/navigation";
import { getCurrentProfile, roleHome } from "@/lib/auth";

export default async function HomePage() {
  const { profile } = await getCurrentProfile();
  redirect(roleHome(profile?.user_type));
}
