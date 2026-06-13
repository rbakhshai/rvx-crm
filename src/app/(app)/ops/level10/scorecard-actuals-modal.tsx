"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type ScorecardActual = {
  metricIndex: number;
  metricName: string;
  actual: number;
  format: "n" | "pct";
};

export function ScorecardActualsButton({
  metricIndex,
  metricName,
  actual,
  format,
  children,
}: {
  metricIndex: number;
  metricName: string;
  actual: number;
  format: "n" | "pct";
  children: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="text-foreground hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-medium transition underline-offset-2 hover:underline"
      >
        {children}
      </button>

      {showModal && (
        <ScorecardActualsModal
          metricIndex={metricIndex}
          metricName={metricName}
          actual={actual}
          format={format}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function ScorecardActualsModal({
  metricIndex,
  metricName,
  actual,
  format,
  onClose,
}: {
  metricIndex: number;
  metricName: string;
  actual: number;
  format: "n" | "pct";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{metricName}</h2>
            <p className="text-sm text-muted">
              Actual: <span className="font-semibold">{format === "pct" ? `${actual}%` : actual}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          <ScorecardActualsContent
            metricIndex={metricIndex}
            metricName={metricName}
            actual={actual}
          />
        </div>
      </div>
    </div>
  );
}

function ScorecardActualsContent({
  metricIndex,
  metricName,
  actual,
}: {
  metricIndex: number;
  metricName: string;
  actual: number;
}) {
  // Metric descriptions and data fetch helpers
  const descriptions: Record<number, { title: string; description: string }> = {
    0: {
      title: "Active Bird Dogs",
      description: "Bird dogs with active status in the system.",
    },
    1: {
      title: "Total New Leads Submitted",
      description: "All deals created in the last 7 days.",
    },
    2: {
      title: "Leads Qualified Rate",
      description: "Percentage of new leads that reached qualified status.",
    },
    3: {
      title: "Closer First-Touch SLA",
      description: "Percentage of qualified leads touched within 24 hours of creation.",
    },
    4: {
      title: "LOIs Submitted",
      description: "Deals at LOI status or beyond, updated in the last 7 days.",
    },
    5: {
      title: "PSA Submitted",
      description: "Deals at PSA status or beyond, updated in the last 7 days.",
    },
    6: {
      title: "Signed PSAs",
      description: "Deals at PSA accepted status, updated this month.",
    },
  };

  const info = descriptions[metricIndex] || { title: metricName, description: "" };

  return (
    <div className="space-y-4">
      {info.description && (
        <p className="text-sm text-muted">{info.description}</p>
      )}

      <div className="bg-foreground/[0.02] rounded-lg p-4 border border-border">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1">Count</p>
          <p className="text-3xl font-bold text-foreground">{actual}</p>
        </div>
      </div>

      <div className="text-xs text-muted space-y-2">
        <p>💡 <strong>Tip:</strong> To see individual {metricIndex === 0 ? "bird dogs" : "deals"}, visit the related page in the navigation.</p>
        {metricIndex === 0 && <p>Navigate to <strong>Admin → Lead Pool</strong> to manage bird dogs.</p>}
        {metricIndex !== 0 && <p>Navigate to <strong>Acquisition → Pipeline</strong> to view deals by stage.</p>}
      </div>
    </div>
  );
}
