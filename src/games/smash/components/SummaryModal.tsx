import React from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography
} from "@mui/material";

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Swipe summary</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {summary ? (
            <>
              <Typography variant="body1">
                <strong>{summary.totalSwipes}</strong> swipes with a{" "}
                <strong>{summary.smashRate}%</strong> smash rate.
              </Typography>

              <Stack spacing={1}>
                <Typography variant="subtitle2">Top types</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.topTypes.length ? (
                    summary.topTypes.map((entry) => (
                      <Chip
                        key={entry.type}
                        color="secondary"
                        label={`${entry.type} (${entry.count})`}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      None yet
                    </Typography>
                  )}
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  Average battle stats
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.avgStats.map((stat) => (
                    <Chip
                      key={stat.label}
                      variant="outlined"
                      label={`${stat.label} ${stat.value}`}
                    />
                  ))}
                </Stack>
              </Stack>
            </>
          ) : (
            <Typography color="text.secondary">Loading summary…</Typography>
          )}

          <Button variant="contained" onClick={onClose}>
            Keep swiping
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
