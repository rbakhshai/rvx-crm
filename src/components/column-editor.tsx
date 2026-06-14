"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type ColumnConfig = { key: string; label: string; visible: boolean; order: number };

/**
 * Modal for customizing which columns are visible in a list view,
 * and in what order. Drag to reorder, click X to hide, click + ADD
 * to show hidden columns.
 */
export function ColumnEditor({
  scope,
  allColumns,
  selectedColumns,
  onSave,
  onClose,
}: {
  scope: "contacts" | "companies" | "deals";
  allColumns: ColumnConfig[];
  selectedColumns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [columns, setColumns] = useState<ColumnConfig[]>(selectedColumns);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const visibleColumns = columns.filter((c) => c.visible).sort((a, b) => a.order - b.order);
  const hiddenColumns = allColumns.filter((c) => !columns.some((col) => col.key === c.key && col.visible));

  function toggleColumn(key: string) {
    setColumns((prev) =>
      prev.map((c) =>
        c.key === key
          ? { ...c, visible: !c.visible }
          : c,
      ),
    );
  }

  function addColumn(key: string) {
    const col = allColumns.find((c) => c.key === key);
    if (!col) return;
    setColumns((prev) => [
      ...prev,
      { ...col, visible: true, order: Math.max(...prev.map((c) => c.order), 0) + 1 },
    ]);
  }

  function removeColumn(key: string) {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  }

  function moveColumn(key: string, direction: "up" | "down") {
    const visible = visibleColumns.map((c) => c.key);
    const idx = visible.indexOf(key);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === visible.length - 1)) {
      return;
    }
    const newOrder = direction === "up" ? idx - 1 : idx + 1;
    const newVisible = [...visible.slice(0, idx), ...visible.slice(idx + 1)];
    newVisible.splice(newOrder, 0, key);

    setColumns((prev) =>
      prev.map((c) => {
        const newIdx = newVisible.indexOf(c.key);
        return newIdx >= 0 ? { ...c, order: newIdx } : c;
      }),
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await onSave(columns);
      if (!result.ok) {
        toast.error(result.error ?? "Couldn't save columns");
        return;
      }
      toast.success("Columns saved");
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[80vh] flex flex-col shadow-lg border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold">Column Editor</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition"
            disabled={isPending}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-muted">These fields will display left to right</p>

          {/* Visible columns */}
          <div className="space-y-1.5">
            {visibleColumns.length === 0 ? (
              <p className="text-xs text-muted italic">No columns selected</p>
            ) : (
              visibleColumns.map((col, idx) => (
                <div
                  key={col.key}
                  className="flex items-center justify-between bg-foreground/[0.03] p-3 rounded-md border border-border hover:border-foreground/20 transition"
                >
                  <span className="text-sm font-medium flex-1">{col.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveColumn(col.key, "up")}
                      disabled={idx === 0 || isPending}
                      className="p-1 text-muted hover:text-foreground disabled:opacity-40 transition"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveColumn(col.key, "down")}
                      disabled={idx === visibleColumns.length - 1 || isPending}
                      className="p-1 text-muted hover:text-foreground disabled:opacity-40 transition"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeColumn(col.key)}
                      disabled={isPending}
                      className="p-1 text-muted hover:text-rose-600 transition"
                      title="Remove column"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Hidden columns — add button */}
          {hiddenColumns.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted mb-2 font-semibold uppercase">Add columns</p>
              <div className="space-y-1.5">
                {hiddenColumns.map((col) => (
                  <button
                    key={col.key}
                    onClick={() => addColumn(col.key)}
                    disabled={isPending}
                    className="w-full flex items-center justify-between bg-primary/[0.06] hover:bg-primary/[0.12] p-3 rounded-md border border-primary/20 hover:border-primary/40 transition text-sm text-foreground disabled:opacity-40"
                  >
                    <span>+ {col.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-border">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-40"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
