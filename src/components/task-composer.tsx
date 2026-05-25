"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { createTaskAction } from "@/app/actions/tasks";

const TYPE_OPTIONS = [
  { value: "task", label: "Task" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "admin", label: "Admin" },
];

export function TaskComposer({
  parentTable,
  parentId,
  assigneeOptions,
  defaultAssigneeId,
}: {
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs";
  parentId: string;
  assigneeOptions: Array<{ value: string; label: string }>;
  defaultAssigneeId?: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<string>("task");
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssigneeId ?? "");
  const [dueAt, setDueAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTaskAction(parentTable, parentId, formData);
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setSubject("");
      setDueAt("");
      setType("task");
      router.refresh();
    });
  }

  const fieldClass = "rounded-md border border-border bg-background px-2 py-1 text-xs";

  return (
    <form action={submit} className="rounded-lg border border-border p-3 bg-foreground/[0.015] space-y-2">
      <input
        type="text"
        name="subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Add a task — e.g. 'Call seller back Friday'"
        className="w-full bg-transparent text-sm placeholder:text-muted/70 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          name="assigneeId"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className={fieldClass}
        >
          <option value="">Assign to me</option>
          {assigneeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          name="dueAt"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className={fieldClass}
          aria-label="Due date"
        />
        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <Button type="submit" size="sm" disabled={isPending || !subject.trim()}>
            {isPending ? "Adding…" : "Add task"}
          </Button>
        </div>
      </div>
    </form>
  );
}
