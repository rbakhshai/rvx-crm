import { asc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogStatuses } from "@/db/schema";
import { PageShell } from "../../page-shell";
import { BirdDogForm } from "../bird-dog-form";
import { createBirdDogAction } from "../actions";

export default async function NewBirdDogPage() {
  const statuses = await db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder));
  return (
    <PageShell title="New bird dog" subtitle="Onboard a new scout.">
      <BirdDogForm action={createBirdDogAction} statuses={statuses} cancelHref="/bird-dogs" submitLabel="Create bird dog" />
    </PageShell>
  );
}
