import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme
} from "@mui/material";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useLocale } from "@/app/providers/LocaleProvider";
import { useShell } from "@/app/providers/ShellProvider";

export const HelpDialog = () => {
  const shell = useShell();
  const { strings } = useLocale();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <Tooltip title={strings.shell.openHelp}>
        <IconButton
          aria-label={strings.shell.openHelp}
          onClick={() => shell.setHelpOpen(true)}
          sx={{
            border: "1px solid",
            borderColor: alpha(theme.palette.secondary.main, 0.18),
            bgcolor: alpha(theme.palette.secondary.light, 0.12),
            color: "text.primary",
            "&:hover": {
              bgcolor: alpha(theme.palette.secondary.main, 0.14)
            }
          }}
        >
          <HelpOutlineRoundedIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={shell.helpOpen}
        onClose={() => shell.setHelpOpen(false)}
        fullScreen={isPhone}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{shell.help.title ?? strings.shell.helpTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {shell.help.body}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
