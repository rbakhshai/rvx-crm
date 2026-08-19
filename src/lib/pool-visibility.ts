/**
 * One switch for the Pathway to Partnership rollout.
 *
 * false → /pool and its nav tab are visible to the ADMIN ONLY, no
 *         matter what roles/permissions say (Reza, 2026-07-12: hidden
 *         from everyone but him until he's ready to launch it).
 * true  → launch: the tab + page open up to leadership with the
 *         view_pool permission, exactly as before.
 *
 * Flip this single constant at launch — nothing else to change.
 */
export const POOL_LAUNCHED = false;
