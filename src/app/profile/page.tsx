import { redirect } from "next/navigation";

import { ProfilePage } from "@/features/settings/ProfilePage";
import { getSession } from "@/lib/auth";

export default async function Page() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    redirect("/login");
  }

  return <ProfilePage />;
}