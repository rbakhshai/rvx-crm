import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { HardRedirect } from "@/components/hard-redirect";

const RESERVED_SUB_ROUTES = new Set(["new"]);
import { db } from "@/db";
import { birdDogs, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Drawer } from "@/components/drawer";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { LinkButton } from "@/components/button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value == null || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

export default async function BirdDogDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (RESERVED_SUB_ROUTES.has(id)) {
    return <HardRedirect to={`/bird-dogs/${id}`} />;
  }
  const [bd] = await db.select().from(birdDogs).where(eq(birdDogs.id, id)).limit(1);
  if (!bd) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = bd.ownerId
    ? await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, bd.ownerId)).limit(1)
    : [null];

  const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";
  const sub = bd.email ?? undefined;

  return (
    <Drawer title={name} subtitle={sub} fullHref={`/bird-dogs/${id}`} width="600px">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/bird-dogs/${id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
          {bd.acquisitionLevel && <Badge>{bd.acquisitionLevel}</Badge>}
          {bd.isInDiscord && <Badge tone="success">In Discord</Badge>}
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Field label="Email" value={bd.email ?? null} />
          <Field label="Cell" value={bd.cellPhone ?? null} />
          <Field label="Status" value={bd.statusCode ?? null} />
          <Field label="Level" value={bd.acquisitionLevel ?? null} />
        </dl>

        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Manager</div>
          {owner ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={owner.name} id={owner.id} size="xs" />
              <span className="text-sm">{owner.name}</span>
            </span>
          ) : <span className="text-sm text-muted">unassigned</span>}
        </div>

        <TaskList parentTable="bird_dogs" parentId={bd.id} currentUserId={session?.user.id} />
        <ActivityTimeline parentTable="bird_dogs" parentId={bd.id} currentUserId={session?.user.id} />
      </div>
    </Drawer>
  );
}
