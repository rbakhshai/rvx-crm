import { asc } from "drizzle-orm";
import { db } from "@/db";
import { birdDogStatuses } from "@/db/schema";
import { PageShell } from "../../page-shell";
import { BirdDogForm } from "../bird-dog-form";
import { createBirdDogAction } from "../actions";
import { getUserOptions } from "@/lib/validation/shared";

export default async function NewBirdDogPage() {
  const [statuses, ownerOptions] = await Promise.all([
    db.select().from(birdDogStatuses).orderBy(asc(birdDogStatuses.sortOrder)),
    getUserOptions(),
  ]);
  return (
    <PageShell title="New bird dog" subtitle="Onboard a new scout.">
      <BirdDogForm
        action={createBirdDogAction}
        statuses={statuses}
        ownerOptions={ownerOptions}
        cancelHref="/bird-dogs"
        submitLabel="Create bird dog"
      />
    </PageShell>
  );
}
