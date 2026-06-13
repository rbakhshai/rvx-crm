import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, isNotNull, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { PortalHero, PortalSection, PortalCard } from "../../today/portal-kit";
import { fmtDateWithWeekday } from "@/lib/date-format";

export default async function LeaderboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_today"))) notFound();

  const userRole = (session.user as { role?: string }).role || "admin";
  const currentUserId = (session.user as { id?: string }).id;

  // Query bird dogs with appointments, ranked by stats
  const bdRaw = await db
    .select({
      id: birdDogs.id,
      firstName: birdDogs.firstName,
      lastName: birdDogs.lastName,
      email: birdDogs.email,
      statusCode: birdDogs.statusCode,
      appointmentsBooked: birdDogs.appointmentsBooked,
      leadsSubmitted: birdDogs.leadsSubmitted,
      leadsAccepted: birdDogs.leadsAccepted,
      totalDials: birdDogs.totalDials,
    })
    .from(birdDogs)
    .where(
      and(
        isNotNull(birdDogs.appointmentsBooked),
      )
    )
    .orderBy(
      desc(birdDogs.appointmentsBooked),
      desc(birdDogs.leadsAccepted),
      desc(birdDogs.totalDials)
    );

  // Filter and calculate acceptance rate client-side
  const bdStats = bdRaw
    .filter(bd => (bd.appointmentsBooked ?? 0) > 0)
    .map(bd => ({
      ...bd,
      acceptanceRate: (bd.leadsSubmitted ?? 0) > 0
        ? ((bd.leadsAccepted ?? 0) / (bd.leadsSubmitted ?? 0) * 100).toFixed(1)
        : "0",
    }));

  const isBirdDog = ["bd_level_1", "bd_level_2", "bd_level_3"].includes(userRole);

  return (
    <PageShell title="Bird Dog Leaderboard" width="wide">
      <PortalHero
        greeting="Bird Dog Performance"
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Company-Wide"
        title="Leaderboard"
        tagline="Top performers ranked by appointments booked, leads accepted, and activity."
        icon="🏆"
        accent="purple"
      />

      <PortalSection title="Active Bird Dogs" accent="purple" hint={`${bdStats.length} with appointments booked`}>
        <PortalCard>
          {bdStats.length === 0 ? (
            <div className="text-center py-8 text-muted">
              No bird dogs with appointments booked yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-muted">#</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted">Name</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted">Appointments</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted">Leads Submitted</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted">Leads Accepted</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted">Acceptance %</th>
                    <th className="text-center py-2 px-3 font-semibold text-muted">Total Dials</th>
                  </tr>
                </thead>
                <tbody>
                  {bdStats.map((bd, idx) => {
                    const isCurrentUser = isBirdDog && bd.id === currentUserId;
                    return (
                      <tr
                        key={bd.id}
                        className={`border-b border-border/50 transition ${
                          isCurrentUser ? "bg-purple-50 dark:bg-purple-500/10" : "hover:bg-foreground/[0.03]"
                        }`}
                      >
                        <td className="py-3 px-3 font-bold text-center">{idx + 1}</td>
                        <td className="py-3 px-3 font-medium">
                          {bd.firstName} {bd.lastName}
                          {isCurrentUser && <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">YOU</span>}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">{bd.appointmentsBooked ?? 0}</td>
                        <td className="py-3 px-3 text-center">{bd.leadsSubmitted ?? 0}</td>
                        <td className="py-3 px-3 text-center text-green-600 dark:text-green-400 font-medium">
                          {bd.leadsAccepted ?? 0}
                        </td>
                        <td className="py-3 px-3 text-center">{bd.acceptanceRate ?? 0}%</td>
                        <td className="py-3 px-3 text-center">{bd.totalDials ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PortalCard>
      </PortalSection>
    </PageShell>
  );
}
