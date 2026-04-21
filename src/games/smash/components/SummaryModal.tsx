import React from "react";
import { useLocale } from "@/app/providers/LocaleProvider";
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
  const { strings } = useLocale();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{strings.summary.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {summary ? (
            <>
              <Typography variant="body1">
                <strong>
                  {strings.summary.sentence(summary.totalSwipes, summary.smashRate)}
                </strong>
              </Typography>

              <Stack spacing={1}>
                <Typography variant="subtitle2">{strings.summary.topTypes}</Typography>
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
                      {strings.summary.noneYet}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2">{strings.summary.avgStats}</Typography>
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
            <Typography color="text.secondary">{strings.summary.loading}</Typography>
          )}

          <Button variant="contained" onClick={onClose}>
            {strings.summary.keepSwiping}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
