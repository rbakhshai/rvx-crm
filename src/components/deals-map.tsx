"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  InfoWindow,
  Pin as GMapPin,
} from "@vis.gl/react-google-maps";

type DealPin = {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  /** Friendly stage group code — drives pin color */
  group: "new" | "contact" | "uw" | "offer" | "contract" | "won" | "network" | "drip" | "lost" | "dead" | "unknown";
  groupLabel: string;
  listPrice: string | null;
};

const TONE: Record<DealPin["group"], { bg: string; border: string; glyph: string; label: string }> = {
  new:      { bg: "#3b82f6", border: "#1d4ed8", glyph: "•", label: "New" },
  contact:  { bg: "#f59e0b", border: "#b45309", glyph: "•", label: "Talking with seller" },
  uw:       { bg: "#a855f7", border: "#7e22ce", glyph: "•", label: "Underwriting" },
  offer:    { bg: "#ec4899", border: "#be185d", glyph: "•", label: "Making offer" },
  contract: { bg: "#10b981", border: "#047857", glyph: "•", label: "Under contract" },
  won:      { bg: "#facc15", border: "#a16207", glyph: "★", label: "Closed — RVX acquired" },
  network:  { bg: "#facc15", border: "#a16207", glyph: "★", label: "Closed — network" },
  drip:     { bg: "#94a3b8", border: "#475569", glyph: "•", label: "Drip / follow-up" },
  lost:     { bg: "#ef4444", border: "#b91c1c", glyph: "•", label: "Lost" },
  dead:     { bg: "#ef4444", border: "#b91c1c", glyph: "•", label: "Not pursuing" },
  unknown:  { bg: "#64748b", border: "#334155", glyph: "•", label: "In progress" },
};

function fmtMoney(v: string | null): string {
  if (!v) return "";
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  return `$${n.toLocaleString()}`;
}

export function DealsMap({ pins, mapId, apiKey }: { pins: DealPin[]; mapId?: string; apiKey: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pins.find((p) => p.id === selectedId);

  // Default to centre of CONUS so the map shows the whole country
  const defaultCenter = { lat: 39.5, lng: -98.35 };

  // Tally by group for the legend
  const counts = useMemo(() => {
    const m = new Map<DealPin["group"], number>();
    for (const p of pins) m.set(p.group, (m.get(p.group) ?? 0) + 1);
    return m;
  }, [pins]);

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-6 text-center text-sm">
        Map needs <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="text-xs">.env.local</code>.
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center">
        <p className="text-sm text-foreground/80">No active deals have been geocoded yet.</p>
        <p className="mt-1 text-[11px] text-muted">
          Run <code className="text-xs">npm run geocode:deals</code> to populate coordinates.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-foreground/[0.02]">
      <div className="h-[420px] w-full">
        <APIProvider apiKey={apiKey}>
          <GMap
            mapId={mapId ?? "DEMO_MAP_ID"}
            defaultCenter={defaultCenter}
            defaultZoom={4}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
          >
            {pins
              .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
              .map((p) => {
                const tone = TONE[p.group];
                return (
                  <AdvancedMarker
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <GMapPin background={tone.bg} borderColor={tone.border} glyphColor="#ffffff" />
                  </AdvancedMarker>
                );
              })}

            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                onCloseClick={() => setSelectedId(null)}
              >
                <div className="min-w-[200px] max-w-[280px] text-[13px]">
                  <div className="font-semibold text-foreground">{selected.title}</div>
                  {(selected.city || selected.state) && (
                    <div className="text-[11px] text-muted mt-0.5">
                      {[selected.city, selected.state].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: TONE[selected.group].bg }}
                    />
                    <span className="text-[11px]">{selected.groupLabel}</span>
                  </div>
                  {fmtMoney(selected.listPrice) && (
                    <div className="mt-1 text-[12px] font-medium tabular-nums">
                      {fmtMoney(selected.listPrice)}
                    </div>
                  )}
                  <Link
                    href={`/deals/${selected.id}`}
                    className="mt-2 inline-block text-[12px] text-primary hover:underline"
                  >
                    Open deal →
                  </Link>
                </div>
              </InfoWindow>
            )}
          </GMap>
        </APIProvider>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-2.5 border-t border-border text-[11px]">
        {Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([g, n]) => (
            <div key={g} className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: TONE[g].bg }} />
              <span className="text-foreground/80">{TONE[g].label}</span>
              <span className="text-muted tabular-nums">· {n}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
