import { Badge } from "./badge";

export function MatchScorePill({ score }: { score: number }) {
  // Hot: 60+, Warm: 30–59, Cool: 1–29
  const tone = score >= 60 ? "success" : score >= 30 ? "warning" : "info";
  return <Badge tone={tone}>{score}</Badge>;
}
