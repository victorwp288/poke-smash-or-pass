import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export type SmashSummary = {
  totalSwipes: number;
  smashRate: number;
  topTypes: Array<{ type: string; count: number }>;
  avgStats: Array<{ label: string; value: number }>;
};

export const SummaryModal = ({
  open,
  summary,
  onClose
}: {
  open: boolean;
  summary: SmashSummary | null;
  onClose: () => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swipe summary</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          {summary ? (
            <>
              <div>
                <strong>{summary.totalSwipes}</strong> swipes ·{" "}
                <strong>{summary.smashRate}%</strong> smash rate
              </div>
              <div>
                <strong>Top types:</strong>{" "}
                {summary.topTypes.length
                  ? summary.topTypes
                    .map((entry) => `${entry.type} (${entry.count})`)
                    .join(", ")
                  : "None yet"}
              </div>
              <div>
                <strong>Avg stats:</strong>{" "}
                {summary.avgStats
                  .map((stat) => `${stat.label} ${stat.value}`)
                  .join(" · ")}
              </div>
            </>
          ) : (
            <div>Loading summary…</div>
          )}
        </div>
        <button className="action shuffle" type="button" onClick={onClose}>
          Keep swiping
        </button>
      </DialogContent>
    </Dialog>
  );
};
