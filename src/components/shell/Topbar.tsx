import React from "react";
import {
  Box,
  Button,
  Chip,
  ClickAwayListener,
  Collapse,
  Paper,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from "@mui/material";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import { useLocation } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { HelpDialog } from "@/components/shell/HelpDialog";

export const Topbar = () => {
  const shell = useShell();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const { setScoreboard, setStatus } = shell;

  React.useEffect(() => {
    setScoreboard(null);
    setStatus("Ready");
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  React.useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const categoryLabel = shell.header.category ?? "Smash / Pass";
  const titleLabel = shell.header.title ?? "SmashDex Arcade";

  if (!isDesktop) {
    return (
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: "max(env(safe-area-inset-top), 12px)",
          insetInline: 0,
          zIndex: theme.zIndex.appBar,
          px: 1.25,
          pointerEvents: "none"
        }}
      >
        <ClickAwayListener onClickAway={() => setMobileOpen(false)}>
          <Stack
            spacing={1}
            sx={{
              mx: "auto",
              maxWidth: 1280,
              pointerEvents: "auto"
            }}
          >
            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 0,
                px: 1.25,
                py: 1,
                backgroundColor: "background.paper",
                boxShadow: "none"
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                justifyContent="space-between"
              >
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Chip
                      size="small"
                      color="secondary"
                      label={categoryLabel}
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 700
                      }}
                    >
                      {shell.status}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 700,
                      lineHeight: 1.1
                    }}
                  >
                    {titleLabel}
                  </Typography>
                </Stack>

                <Button
                  size="small"
                  color="secondary"
                  variant={mobileOpen ? "contained" : "outlined"}
                  endIcon={
                    mobileOpen ? (
                      <KeyboardArrowUpRoundedIcon />
                    ) : (
                      <KeyboardArrowDownRoundedIcon />
                    )
                  }
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-shell-panel"
                  onClick={() => setMobileOpen((prev) => !prev)}
                  sx={{ flexShrink: 0, minWidth: 92 }}
                >
                  {mobileOpen ? "Hide" : "Show"}
                </Button>
              </Stack>
            </Paper>

            <Collapse in={mobileOpen} timeout={220} unmountOnExit>
              <Paper
                id="mobile-shell-panel"
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 0,
                  px: 1.5,
                  py: 1.5,
                  backgroundColor: "background.paper",
                  boxShadow: "none"
                }}
              >
                <Stack spacing={1.5}>
                  <Stack spacing={0.75}>
                    <Typography variant="overline" color="text.secondary">
                      {categoryLabel}
                    </Typography>
                    <Typography variant="h3">{titleLabel}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Open the deck bar when you want live status, help, or the
                      session score without giving up card space on mobile.
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{
                      "& .score-pill": {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                        minHeight: 40,
                        px: 1.5,
                        py: 1,
                        borderRadius: 0,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        fontWeight: 700,
                        color: "text.primary"
                      }
                    }}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 0,
                        bgcolor: alpha(theme.palette.secondary.main, 0.06),
                        borderColor: "divider",
                        fontWeight: 700,
                        color: "text.primary",
                        textAlign: "center"
                      }}
                    >
                      {shell.status}
                    </Paper>
                    {shell.scoreboard ? (
                      <Box sx={{ minWidth: 0 }}>{shell.scoreboard}</Box>
                    ) : null}
                    <HelpDialog />
                  </Stack>
                </Stack>
              </Paper>
            </Collapse>
          </Stack>
        </ClickAwayListener>
      </Box>
    );
  }

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        px: { xs: 1.5, sm: 2.5 },
        pt: { xs: 1.5, sm: 2.5 }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mx: "auto",
          maxWidth: 1280,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0,
          px: { xs: 1.5, sm: 2.5, md: 3.25 },
          py: { xs: 1.5, sm: 2 },
          backgroundColor: "background.paper",
          boxShadow: "none"
        }}
      >
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1.5, md: 2 }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <Stack spacing={0.75}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  color="secondary"
                  label={categoryLabel}
                  sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                />
                <Typography variant="overline" color="text.secondary">
                  Single-mode mobile deck
                </Typography>
              </Stack>
              <Typography
                variant={isDesktop ? "h2" : "h3"}
                sx={{ color: "text.primary", textWrap: "balance" }}
              >
                {titleLabel}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 760 }}
              >
                SmashDex only, focused on fast swiping, rich card details, and a
                cleaner mobile deck-building rhythm.
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{
                minWidth: { md: 300 },
                "& .score-pill": {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                  minHeight: 40,
                  px: 1.75,
                  py: 1,
                  borderRadius: 0,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  fontWeight: 700,
                  color: "text.primary"
                }
              }}
            >
              <Paper
                variant="outlined"
                sx={{
                  px: 1.75,
                  py: 1,
                  borderRadius: 0,
                  bgcolor: alpha(theme.palette.secondary.main, 0.06),
                  borderColor: "divider",
                  fontWeight: 700,
                  color: "text.primary",
                  textAlign: "center"
                }}
              >
                {shell.status}
              </Paper>
              {shell.scoreboard ? <Box>{shell.scoreboard}</Box> : null}
              <HelpDialog />
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
