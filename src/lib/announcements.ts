/**
 * Announcement feed query — shared by the BD Today hub (read-only
 * card) and /bd-team (leadership composer + manage list).
 */
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { announcements, user } from "@/db/schema";

export type AnnouncementRow = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
};

export async function getAnnouncements(limit = 10): Promise<AnnouncementRow[]> {
  const rows = await db
    .select({
      id: announcements.id,
      body: announcements.body,
      authorName: user.name,
      createdAt: announcements.createdAt,
    })
    .from(announcements)
    .leftJoin(user, eq(user.id, announcements.createdById))
    .where(isNull(announcements.deletedAt))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorName: r.authorName ?? "Leadership",
    createdAt: r.createdAt,
  }));
}
