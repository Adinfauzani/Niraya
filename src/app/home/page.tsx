import { HomePage } from "@/features/home/HomePage";
import { getSession } from "@/lib/auth";
import { getHomeDiscoveryData } from "@/server/discovery/home";

export default async function Page() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  const data = await getHomeDiscoveryData();

  const currentUser = user
    ? { name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }
    : null;

  return <HomePage data={data} user={currentUser} />;
}
