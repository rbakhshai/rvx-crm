"use client";

import { useState } from "react";
import { ColumnEditor, type ColumnConfig } from "@/components/column-editor";
import { saveColumnPreferences } from "@/app/actions/list-preferences";

export function CompanyColumnButton({
  allColumns,
  selectedColumns,
}: {
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
          scope="companies"
          allColumns={allColumns}
          selectedColumns={selectedColumns}
          onSave={(cols) => saveColumnPreferences("companies", cols)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
