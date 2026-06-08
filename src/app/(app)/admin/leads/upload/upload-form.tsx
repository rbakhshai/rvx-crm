"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { uploadLeadsCsvAction, type UploadResult } from "@/app/actions/leads";

/**
 * Drag-and-drop / click-to-pick CSV uploader. Shows a result panel
 * after the action returns so the admin can verify what landed.
 */
export function CsvUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      try {
        const r = await uploadLeadsCsvAction(fd);
        setResult(r);
        if (r.ok) {
          toast.success(`Imported ${r.inserted} lead${r.inserted === 1 ? "" : "s"}`);
          router.refresh();
        } else if (r.error) {
          toast.error(r.error);
        }
      } catch (e) {
        toast.error("Upload failed", { description: e instanceof Error ? e.message : "Try again" });
      }
    });
  }

  function clear() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      {/* Pick file */}
      <div className="rounded-xl border-2 border-dashed border-border bg-foreground/[0.02] p-8">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setResult(null);
          }}
          className="block w-full text-sm cursor-pointer
            file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground
            file:px-3 file:py-1.5 file:text-xs file:font-medium file:cursor-pointer
            file:mr-3 file:hover:opacity-90"
        />
        {file && (
          <p className="mt-3 text-xs text-muted">
            Selected: <span className="text-foreground font-medium">{file.name}</span>
            {" · "}
            {Math.round(file.size / 1024)} KB
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!file || isPending}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? "Importing…" : "Import CSV"}
          </button>
          {file && (
            <button
              type="button"
              onClick={clear}
              disabled={isPending}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Result panel */}
      {result && (
        <div
          className={
            "rounded-xl border p-5 " +
            (result.ok
              ? "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-500/[0.04]"
              : "border-rose-300/40 bg-rose-50/40 dark:bg-rose-500/[0.04]")
          }
        >
          <div className="text-sm font-semibold mb-2">
            {result.ok ? "Import complete" : "Import failed"}
          </div>
          {!result.ok && result.error && (
            <p className="text-sm text-rose-700 dark:text-rose-300">{result.error}</p>
          )}
          {result.ok && (
            <ul className="text-xs space-y-1">
              <li>
                ✓ <strong>{result.inserted}</strong> new lead{result.inserted === 1 ? "" : "s"} added to the pool.
              </li>
              {result.dupes > 0 && (
                <li>
                  ⚠ <strong>{result.dupes}</strong> duplicate{result.dupes === 1 ? "" : "s"} skipped (already in the pool — matched on street + city + state).
                </li>
              )}
              {result.skipped > 0 && (
                <li>
                  ✕ <strong>{result.skipped}</strong> row{result.skipped === 1 ? "" : "s"} skipped (no usable identifying info).
                </li>
              )}
              {result.unmappedHeaders.length > 0 && (
                <li className="text-muted">
                  Unmapped columns saved in extra data: {result.unmappedHeaders.join(", ")}
                </li>
              )}
            </ul>
          )}
          {result.ok && (
            <div className="mt-4 flex items-center gap-3 text-xs">
              <Link href="/admin/leads" className="text-primary hover:underline font-medium">
                View pool →
              </Link>
              {result.batchId && (
                <span className="text-muted">
                  Batch ID: <code className="bg-foreground/[0.06] rounded px-1">{result.batchId.slice(0, 8)}</code>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
