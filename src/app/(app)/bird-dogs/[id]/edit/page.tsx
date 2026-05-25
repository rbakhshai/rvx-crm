import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, birdDogStatuses } from "@/db/schema";
import { PageShell } from "../../../page-shell";
import { BirdDogForm } from "../../bird-dog-form";
import { updateBirdDogAction } from "../../actions";

export default async function EditBirdDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bd] = await db.select().from(birdDogs).where(eq(birdDogs.id, id)).limit(1);
  if (!bd) notFound();
  const statuses = await db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder));
  const bound = updateBirdDogAction.bind(null, id);
  const name = [bd.firstName, bd.lastName].filter(Boolean).join(" ") || "(unnamed)";
  return (
    <PageShell title={`Edit · ${name}`} subtitle="Update bird dog details.">
      <BirdDogForm action={bound} birdDog={bd} statuses={statuses} cancelHref={`/bird-dogs/${id}`} submitLabel="Save changes" />
    </PageShell>
  );
}
