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
import { useLocale } from "@/app/providers/LocaleProvider";
import type {
  HistoryEntry,
  SmashFiltersStorage,
  SmashHistoryStorage,
  SmashOptionsStorage
} from "@/games/smash/smashTypes";
import { getHistoryEntryKey } from "@/games/smash/smashStorage";
import { TYPE_COLORS, TYPE_ICON_FILES } from "@/lib/constants";
import { getTypeLabel } from "@/lib/i18n/it";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";

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
  const { locale, setLocale, strings } = useLocale();
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
              {strings.filters.overline}
            </Typography>
            <Typography variant="h2">{strings.filters.title}</Typography>
          </div>
          <Button
            color="secondary"
            variant="outlined"
            startIcon={<CloseRoundedIcon />}
            onClick={onClose}
          >
            {strings.common.close}
          </Button>
        </Stack>

        <DrawerSection title={strings.filters.generations}>
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
              {strings.filters.selectAll}
            </Button>
            <Button size="small" color="secondary" onClick={onClearGens}>
              {strings.common.clear}
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection title={strings.filters.types}>
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
                  {getTypeLabel(locale, type)}
                </Button>
              );
            })}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={onSetAllTypes}>
              {strings.filters.allTypes}
            </Button>
            <Button size="small" color="secondary" onClick={onClearTypes}>
              {strings.common.clear}
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection title={strings.filters.deckOptions}>
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
              label={strings.filters.smashPassMode}
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
              label={strings.filters.autoReveal}
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
              label={strings.filters.shinyMode}
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
              label={strings.filters.dailyDeck}
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
              label={strings.filters.onlyMega}
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
              label={strings.filters.keepHistory}
            />
          </Stack>
        </DrawerSection>

        <DrawerSection title={strings.shell.languageLabel}>
          <ToggleButtonGroup
            exclusive
            value={locale}
            onChange={(_, value: "en" | "it" | null) => {
              if (value) setLocale(value);
            }}
            sx={{
              gap: 0,
              "& .MuiToggleButtonGroup-grouped": {
                mr: 0,
                borderRadius: "0 !important",
                border: `1px solid ${alpha(theme.palette.text.primary, 0.12)} !important`
              }
            }}
          >
            <ToggleButton value="en">{strings.shell.english}</ToggleButton>
            <ToggleButton value="it">{strings.shell.italian}</ToggleButton>
          </ToggleButtonGroup>
        </DrawerSection>

        <DrawerSection title={strings.filters.badges}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.length ? (
              badges.map((badge) => (
                <Chip key={badge} color="primary" label={badge} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.badgesEmpty}
              </Typography>
            )}
          </Stack>
        </DrawerSection>

        <DrawerSection
          title={strings.filters.favorites}
          action={
            <Chip size="small" label={favorites.length} color="secondary" />
          }
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {favorites.length ? (
              favorites.map((fav) => (
                <CollectChip key={getHistoryEntryKey(fav)} entry={fav} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.favoritesEmpty}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button onClick={onExportJson} disabled={!favorites.length}>
              {strings.filters.exportJson}
            </Button>
            <Button onClick={onExportCsv} disabled={!favorites.length}>
              {strings.filters.exportCsv}
            </Button>
            <Button
              color="secondary"
              onClick={onShareCard}
              disabled={!favorites.length && !history.smash.length}
            >
              {strings.filters.shareCard}
            </Button>
          </Stack>
        </DrawerSection>

        <DrawerSection
          title={strings.filters.recentSmash}
          action={<Chip size="small" label={smashList.length} />}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {smashList.length ? (
              smashList.map((entry, idx) => (
                <CollectChip
                  key={`${getHistoryEntryKey(entry)}-${idx}`}
                  entry={entry}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.recentSmashEmpty}
              </Typography>
            )}
          </Stack>
        </DrawerSection>

        <DrawerSection
          title={strings.filters.recentPass}
          action={<Chip size="small" label={passList.length} />}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {passList.length ? (
              passList.map((entry, idx) => (
                <CollectChip
                  key={`${getHistoryEntryKey(entry)}-${idx}`}
                  entry={entry}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.recentPassEmpty}
              </Typography>
            )}
          </Stack>
          <Button color="secondary" onClick={onClearHistory}>
            {strings.filters.clearHistory}
          </Button>
        </DrawerSection>
      </Stack>
    </Drawer>
  );
};
