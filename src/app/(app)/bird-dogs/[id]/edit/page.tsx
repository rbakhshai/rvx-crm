import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, birdDogStatuses } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { BirdDogForm } from "../../bird-dog-form";
import { updateBirdDogAction } from "../../actions";
import { getUserOptions } from "@/lib/validation/shared";
import { requirePagePermission } from "@/lib/page-guard";

export default async function EditBirdDogPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("view_bird_dogs_directory");
  const { id } = await params;
  const [bd] = await db.select().from(birdDogs).where(eq(birdDogs.id, id)).limit(1);
  if (!bd) notFound();
  const [statuses, ownerOptions] = await Promise.all([
    db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder)),
    getUserOptions(),
  ]);
  const bound = updateBirdDogAction.bind(null, id);
  const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";
  return (
    <PageShell title={`Edit · ${name}`} subtitle="Update bird dog details.">
      <BirdDogForm
        action={bound}
        birdDog={bd}
        statuses={statuses}
        ownerOptions={ownerOptions}
        cancelHref={`/bird-dogs/${id}`}
        submitLabel="Save changes"
      />
    </PageShell>
  );
}
