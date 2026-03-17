import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { DashboardClient } from "@/components/dashboard-client";
import { authOptions } from "@/lib/auth";
import { getDashboardPayload } from "@/lib/election-data";
import { getViewerFromSession } from "@/lib/session";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const viewer = await getViewerFromSession(session);

  if (!viewer) {
    redirect("/login");
  }

  const payload = await getDashboardPayload(viewer);

  return <DashboardClient initialData={payload} />;
}
