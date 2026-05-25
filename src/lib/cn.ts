/** Tiny classname joiner — equivalent to clsx for our needs. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
