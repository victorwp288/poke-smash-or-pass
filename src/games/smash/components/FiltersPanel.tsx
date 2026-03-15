import React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type {
  HistoryEntry,
  SmashFiltersStorage,
  SmashHistoryStorage,
  SmashOptionsStorage
} from "@/games/smash/smashTypes";
import { TYPE_COLORS, TYPE_ICON_FILES } from "@/lib/constants";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import { capitalize } from "@/lib/text";

const GEN_COUNT = 9;
const DESKTOP_HISTORY_LIMIT = 12;

const getTypeIconUrl = (type: PokemonTypeName) => {
  const file = TYPE_ICON_FILES[type];
  if (!file) return "";
  return `icons/types/${file}`;
};

const CollectChip = ({ entry }: { entry: HistoryEntry }) => {
  return (
    <Chip
      variant="outlined"
      avatar={
        entry.thumb ? <Avatar alt={entry.name} src={entry.thumb} /> : undefined
      }
      label={entry.name}
      sx={{ justifyContent: "flex-start" }}
    />
  );
};

const DrawerSection = ({
  title,
  children,
  action
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 0 }}>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography variant="h3">{title}</Typography>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
};

export const FiltersPanel = ({
  open,
  filters,
  options,
  history,
  favorites,
  badges,
  onClose,
  onToggleGen,
  onSetAllGens,
  onClearGens,
  onToggleType,
  onSetAllTypes,
  onClearTypes,
  onChangeOption,
  onClearHistory,
  onExportJson,
  onExportCsv,
  onShareCard
}: {
  open: boolean;
  filters: SmashFiltersStorage;
  options: SmashOptionsStorage;
  history: SmashHistoryStorage;
  favorites: HistoryEntry[];
  badges: string[];
  onClose: () => void;
  onToggleGen: (genId: number) => void;
  onSetAllGens: () => void;
  onClearGens: () => void;
  onToggleType: (type: PokemonTypeName) => void;
  onSetAllTypes: () => void;
  onClearTypes: () => void;
  onChangeOption: <K extends keyof SmashOptionsStorage>(
    key: K,
    value: SmashOptionsStorage[K]
  ) => void;
  onClearHistory: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onShareCard: () => void;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const selectedGens = new Set(filters.gens);
  const selectedTypes = new Set(filters.types);

  const smashList = options.keepHistory
    ? history.smash.slice(-DESKTOP_HISTORY_LIMIT)
    : [];
  const passList = options.keepHistory
    ? history.pass.slice(-DESKTOP_HISTORY_LIMIT)
    : [];

  return (
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 430 },
          maxWidth: "100%",
          maxHeight: { xs: "88dvh", md: "100dvh" },
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: { xs: 0, md: 0 },
          borderBottomRightRadius: { xs: 0, md: 0 }
        }
      }}
    >
      <Stack
        spacing={2}
        sx={{
          p: { xs: 1.5, sm: 2 },
          pb: { xs: "calc(env(safe-area-inset-bottom) + 20px)", sm: 2 },
          overflowY: "auto"
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <div>
            <Typography variant="overline" color="text.secondary">
              Deck studio
            </Typography>
            <Typography variant="h2">SmashDex controls</Typography>
          </div>
          <Button
            color="secondary"
            variant="outlined"
            startIcon={<CloseRoundedIcon />}
            onClick={onClose}
          >
            Close
          </Button>
        </Stack>

        <DrawerSection title="Generations">
          <ToggleButtonGroup
            value={filters.gens.map(String)}
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
            {Array.from({ length: GEN_COUNT }, (_, i) => i + 1).map((genId) => (
              <ToggleButton
                key={genId}
                value={String(genId)}
                selected={selectedGens.has(genId)}
                onChange={() => onToggleGen(genId)}
              >
                Gen {genId}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={onSetAllGens}>
              Select all
            </Button>
            <Button size="small" color="secondary" onClick={onClearGens}>
              Clear
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection title="Types">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))"
              },
              gap: 1
            }}
          >
            {TYPE_LIST.map((type) => {
              const selected = selectedTypes.has(type);
              return (
                <Button
                  key={type}
                  variant={selected ? "contained" : "outlined"}
                  color={selected ? "secondary" : "inherit"}
                  onClick={() => onToggleType(type)}
                  sx={{
                    justifyContent: "flex-start",
                    px: 1.25,
                    py: 1,
                    bgcolor: selected
                      ? undefined
                      : alpha(TYPE_COLORS[type] ?? "#eee", 0.12),
                    color: selected ? undefined : "text.primary"
                  }}
                >
                  <Box
                    component="img"
                    src={getTypeIconUrl(type)}
                    alt=""
                    sx={{ width: 18, height: 18, mr: 1 }}
                  />
                  {capitalize(type)}
                </Button>
              );
            })}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={onSetAllTypes}>
              All types
            </Button>
            <Button size="small" color="secondary" onClick={onClearTypes}>
              Clear
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection title="Deck options">
          <Stack divider={<Divider flexItem />} spacing={0.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={options.smashPassMode}
                  onChange={(event) =>
                    onChangeOption("smashPassMode", event.target.checked)
                  }
                />
              }
              label="Smash or pass mode"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.autoReveal}
                  onChange={(event) =>
                    onChangeOption("autoReveal", event.target.checked)
                  }
                />
              }
              label="Auto-reveal stats"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.shinyMode}
                  onChange={(event) =>
                    onChangeOption("shinyMode", event.target.checked)
                  }
                />
              }
              label="Shiny mode"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.dailyDeck}
                  onChange={(event) =>
                    onChangeOption("dailyDeck", event.target.checked)
                  }
                />
              }
              label="Daily deck (20)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.onlyMega}
                  onChange={(event) =>
                    onChangeOption("onlyMega", event.target.checked)
                  }
                />
              }
              label="Only Mega-capable"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={options.keepHistory}
                  onChange={(event) =>
                    onChangeOption("keepHistory", event.target.checked)
                  }
                />
              }
              label="Keep history"
            />
          </Stack>
        </DrawerSection>

        <DrawerSection title="Badges">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.length ? (
              badges.map((badge) => (
                <Chip key={badge} color="primary" label={badge} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Build streaks and favorites to earn badges.
              </Typography>
            )}
          </Stack>
        </DrawerSection>

        <DrawerSection
          title="Favorites"
          action={
            <Chip size="small" label={favorites.length} color="secondary" />
          }
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {favorites.length ? (
              favorites.map((fav) => <CollectChip key={fav.name} entry={fav} />)
            ) : (
              <Typography variant="body2" color="text.secondary">
                Save a few Pokemon to build a clue deck for later.
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button onClick={onExportJson} disabled={!favorites.length}>
              Export JSON
            </Button>
            <Button onClick={onExportCsv} disabled={!favorites.length}>
              Export CSV
            </Button>
            <Button
              color="secondary"
              onClick={onShareCard}
              disabled={!favorites.length && !history.smash.length}
            >
              Share card
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection
          title="Recent smash list"
          action={<Chip size="small" label={smashList.length} />}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {smashList.length ? (
              smashList.map((entry, idx) => (
                <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No smash picks yet.
              </Typography>
            )}
          </Stack>
        </DrawerSection>

        <DrawerSection
          title="Recent pass list"
          action={<Chip size="small" label={passList.length} />}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {passList.length ? (
              passList.map((entry, idx) => (
                <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No passes yet.
              </Typography>
            )}
          </Stack>
          <Button color="secondary" onClick={onClearHistory}>
            Clear history
          </Button>
        </DrawerSection>
      </Stack>
    </Drawer>
  );
};
