/**
 * Download link for /api/export/:scope. Plain <a> (not next/link):
 * it's a file download, not a navigation.
 */
export function ExportCsvButton({ scope }: { scope: "contacts" | "companies" | "deals" | "bird-dogs" }) {
  return (
    <a
      href={`/api/export/${scope}`}
      download
      title="Download CSV of all records"
      className="px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground rounded-md border border-border hover:border-foreground/50 transition"
    >
      ⬇ CSV
    </a>
  );
}
