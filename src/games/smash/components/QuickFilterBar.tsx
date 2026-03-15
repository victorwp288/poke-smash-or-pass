import React from "react";
import {
  Button,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";

export const QuickFilterBar = ({
  genCount,
  genTotal,
  typeCount,
  typeTotal,
  dailyDeck,
  shinyMode,
  onToggleDailyDeck,
  onToggleShinyMode,
  onOpenFilters
}: {
  genCount: number;
  genTotal: number;
  typeCount: number;
  typeTotal: number;
  dailyDeck: boolean;
  shinyMode: boolean;
  onToggleDailyDeck: () => void;
  onToggleShinyMode: () => void;
  onOpenFilters: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (isMobile) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          borderRadius: 0,
          bgcolor: "background.paper",
          borderColor: "divider"
        }}
      >
        <Stack spacing={0.75}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
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
              onClick={() => setMobileOpen((prev) => !prev)}
              sx={{ flex: 1, minHeight: 36 }}
            >
              {mobileOpen ? "Hide" : "Show"}
            </Button>
            <IconButton
              color="secondary"
              onClick={onOpenFilters}
              aria-label="Open filters"
              sx={{
                flexShrink: 0,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 0
              }}
            >
              <FilterAltRoundedIcon />
            </IconButton>
          </Stack>

          <Collapse in={mobileOpen} timeout={220} unmountOnExit>
            <Stack spacing={0.75}>
              <div style={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  Deck tuned
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  Main card first, controls close by.
                </Typography>
              </div>

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  width: "100%",
                  minWidth: 0,
                  overflowX: "auto",
                  pb: 0.25,
                  "& > *": {
                    flexShrink: 0
                  }
                }}
              >
                <Chip
                  size="small"
                  color="secondary"
                  label={`${genCount}/${genTotal} gens`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${typeCount}/${typeTotal} types`}
                />
                <ToggleButton
                  value="daily"
                  selected={dailyDeck}
                  size="small"
                  onChange={() => onToggleDailyDeck()}
                  aria-label="Toggle daily deck"
                  sx={{ borderRadius: "0 !important", px: 1.5 }}
                >
                  <CalendarTodayRoundedIcon sx={{ mr: 0.75, fontSize: 17 }} />
                  Daily 20
                </ToggleButton>
                <ToggleButton
                  value="shiny"
                  selected={shinyMode}
                  size="small"
                  onChange={() => onToggleShinyMode()}
                  aria-label="Toggle shiny mode"
                  sx={{ borderRadius: "0 !important", px: 1.5 }}
                >
                  <AutoAwesomeRoundedIcon sx={{ mr: 0.75, fontSize: 17 }} />
                  Shiny art
                </ToggleButton>
              </Stack>
            </Stack>
          </Collapse>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 1.25 },
        borderRadius: 0,
        bgcolor: "background.paper",
        borderColor: "divider"
      }}
    >
      <Stack spacing={0.75}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <div style={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              Live deck
            </Typography>
            <Typography variant="body1" fontWeight={700}>
              {genCount}/{genTotal} generations and {typeCount}/{typeTotal}{" "}
              types active
            </Typography>
          </div>
          <Button
            color="secondary"
            startIcon={<TuneRoundedIcon />}
            onClick={onOpenFilters}
          >
            Refine deck
          </Button>
        </Stack>

        <ToggleButtonGroup
          value={[
            dailyDeck ? "daily" : null,
            shinyMode ? "shiny" : null
          ].filter(Boolean)}
          sx={{
            gap: 0,
            flexWrap: "wrap",
            "& .MuiToggleButtonGroup-grouped": {
              mr: 0,
              borderRadius: "0 !important",
              border: `1px solid ${alpha(theme.palette.text.primary, 0.12)} !important`
            }
          }}
        >
          <ToggleButton
            value="daily"
            selected={dailyDeck}
            onChange={() => onToggleDailyDeck()}
            aria-label="Toggle daily deck"
          >
            <CalendarTodayRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
            Daily 20
          </ToggleButton>
          <ToggleButton
            value="shiny"
            selected={shinyMode}
            onChange={() => onToggleShinyMode()}
            aria-label="Toggle shiny mode"
          >
            <AutoAwesomeRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
            Shiny art
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Paper>
  );
};
