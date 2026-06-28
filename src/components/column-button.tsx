"use client";

/**
 * One column-customization button for every list page. Replaces the
 * per-scope ContactColumnButton / CompanyColumnButton / DealColumnButton
 * wrappers, which were identical except for the scope string.
 */
import { useState } from "react";
import { ColumnEditor, type ColumnConfig } from "@/components/column-editor";
import { saveColumnPreferences, type Scope } from "@/app/actions/list-preferences";

export function ColumnButton({
  scope,
  allColumns,
  selectedColumns,
}: {
  scope: Scope;
  allColumns: ColumnConfig[];
  selectedColumns: ColumnConfig[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground rounded-md border border-border hover:border-foreground/50 transition"
        title="Customize columns"
      >
        ⚙️ Columns
      </button>

      {isOpen && (
        <ColumnEditor
          scope={scope}
          allColumns={allColumns}
          selectedColumns={selectedColumns}
          onSave={(cols) => saveColumnPreferences(scope, cols)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
