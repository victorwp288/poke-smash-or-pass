import { useLocale } from "@/app/providers/LocaleProvider";
import { getHistoryEntryKey } from "@/games/smash/smashStorage";
import type {
  HistoryEntry,
  SmashFiltersStorage,
  SmashHistoryStorage,
  SmashOptionsStorage
} from "@/games/smash/smashTypes";
import { TYPE_COLORS, TYPE_ICON_FILES } from "@/lib/constants";
import { getTypeLabel } from "@/lib/i18n/it";
import { getBackdropSurface, getFrostedSurface } from "@/lib/theme";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Drawer,
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
import React from "react";

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
  eyebrow,
  title,
  children,
  action
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 0,
        borderColor: alpha(theme.palette.secondary.main, 0.12),
        bgcolor: getFrostedSurface(theme, 0.94)
      }}
    >
      <Stack spacing={1.35}>
        <Stack spacing={0.4}>
          {eyebrow ? (
            <Typography variant="overline" color="text.secondary">
              {eyebrow}
            </Typography>
          ) : null}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="h3">{title}</Typography>
            {action}
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
};

const SectionActionButton = ({
  label,
  onClick,
  disabled = false
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const theme = useTheme();

  return (
    <Button
      size="small"
      variant="outlined"
      color="secondary"
      onClick={onClick}
      disabled={disabled}
      sx={{
        minHeight: 38,
        borderRadius: 0,
        borderColor: alpha(theme.palette.secondary.main, 0.16),
        bgcolor: getBackdropSurface(theme, 0.9)
      }}
    >
      {label}
    </Button>
  );
};

const OptionToggleRow = ({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 0,
        borderColor: checked
          ? alpha(theme.palette.info.main, 0.28)
          : alpha(theme.palette.secondary.main, 0.12),
        bgcolor: checked
          ? alpha(theme.palette.info.main, 0.06)
          : getBackdropSurface(theme, 0.9)
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        <Switch
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
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
  const genCount = filters.gens.length;
  const typeCount = filters.types.length;

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
          width: { xs: "100%", md: 440 },
          maxWidth: "100%",
          maxHeight: { xs: "90dvh", md: "100dvh" },
          borderTopLeftRadius: { xs: 22, md: 0 },
          borderTopRightRadius: { xs: 22, md: 0 },
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          background: `linear-gradient(180deg, ${alpha(
            theme.palette.mode === "dark"
              ? theme.palette.background.default
              : theme.palette.common.white,
            0.98
          )} 0%, ${theme.palette.background.paper} 100%)`
        }
      }}
    >
      <Stack
        spacing={2}
        sx={{
          p: { xs: 1.5, sm: 2 },
          pb: { xs: "calc(env(safe-area-inset-bottom) + 20px)", sm: 2.5 },
          overflowY: "auto"
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, sm: 1.75 },
            borderRadius: 0,
            borderColor: alpha(theme.palette.secondary.main, 0.12),
            bgcolor: getFrostedSurface(theme, 0.96)
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1.5}
            >
              <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="text.secondary">
                  {strings.filters.overline}
                </Typography>
                <Typography variant="h2">{strings.filters.title}</Typography>
              </Stack>
              <Button
                color="secondary"
                variant="outlined"
                startIcon={<CloseRoundedIcon />}
                onClick={onClose}
                sx={{ flexShrink: 0 }}
              >
                {strings.common.close}
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={`${strings.filters.generations}: ${genCount}/${GEN_COUNT}`}
              />
              <Chip
                size="small"
                color="secondary"
                variant="outlined"
                label={`${strings.filters.types}: ${typeCount}/${TYPE_LIST.length}`}
              />
            </Stack>
          </Stack>
        </Paper>

        <DrawerSection
          eyebrow={strings.filters.button}
          title={strings.filters.generations}
          action={
            <Chip
              size="small"
              color="secondary"
              label={`${genCount}/${GEN_COUNT}`}
            />
          }
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1
            }}
          >
            <SectionActionButton
              label={strings.filters.selectAll}
              onClick={onSetAllGens}
            />
            <SectionActionButton
              label={strings.common.clear}
              onClick={onClearGens}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1
            }}
          >
            {Array.from({ length: GEN_COUNT }, (_, i) => i + 1).map((genId) => {
              const selected = selectedGens.has(genId);
              return (
                <ButtonBase
                  key={genId}
                  onClick={() => onToggleGen(genId)}
                  aria-pressed={selected}
                  sx={{
                    width: "100%",
                    minHeight: { xs: 50, sm: 78 },
                    px: 1.1,
                    py: 1,
                    border: "1px solid",
                    borderColor: selected
                      ? alpha(theme.palette.info.main, 0.36)
                      : alpha(theme.palette.secondary.main, 0.14),
                    borderRadius: 0,
                    textAlign: "left",
                    bgcolor: selected
                      ? alpha(theme.palette.info.main, 0.08)
                      : getFrostedSurface(theme, 0.92),
                    transition: theme.transitions.create([
                      "background-color",
                      "border-color",
                      "box-shadow"
                    ]),
                    "&:hover": {
                      bgcolor: selected
                        ? alpha(theme.palette.info.main, 0.12)
                        : alpha(theme.palette.secondary.main, 0.04)
                    }
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    sx={{ width: "100%" }}
                  >
                    <Typography variant="body1" fontWeight={800}>
                      {strings.card.generationShort(genId)}
                    </Typography>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: selected
                          ? alpha(theme.palette.info.main, 0.45)
                          : alpha(theme.palette.secondary.main, 0.16),
                        bgcolor: selected
                          ? theme.palette.info.main
                          : getBackdropSurface(theme, 0.95),
                        color: selected
                          ? theme.palette.info.contrastText
                          : "text.secondary"
                      }}
                    >
                      {selected ? (
                        <CheckRoundedIcon sx={{ fontSize: 16 }} />
                      ) : null}
                    </Box>
                  </Stack>
                </ButtonBase>
              );
            })}
          </Box>
        </DrawerSection>

        <DrawerSection
          eyebrow={strings.filters.button}
          title={strings.filters.types}
          action={
            <Chip
              size="small"
              color="secondary"
              label={`${typeCount}/${TYPE_LIST.length}`}
            />
          }
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1
            }}
          >
            <SectionActionButton
              label={strings.filters.allTypes}
              onClick={onSetAllTypes}
            />
            <SectionActionButton
              label={strings.common.clear}
              onClick={onClearTypes}
            />
          </Box>

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
                <ButtonBase
                  key={type}
                  onClick={() => onToggleType(type)}
                  aria-pressed={selected}
                  sx={{
                    width: "100%",
                    minHeight: 54,
                    px: 1.1,
                    py: 0.95,
                    border: "1px solid",
                    borderColor: selected
                      ? alpha(theme.palette.info.main, 0.36)
                      : alpha(theme.palette.secondary.main, 0.12),
                    borderRadius: 0,
                    bgcolor: selected
                      ? alpha(theme.palette.info.main, 0.08)
                      : alpha(TYPE_COLORS[type] ?? "#dce3ea", 0.08),
                    transition: theme.transitions.create([
                      "background-color",
                      "border-color"
                    ]),
                    "&:hover": {
                      bgcolor: selected
                        ? alpha(theme.palette.info.main, 0.12)
                        : alpha(TYPE_COLORS[type] ?? "#dce3ea", 0.14)
                    }
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ width: "100%", minWidth: 0 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Box
                        component="img"
                        src={getTypeIconUrl(type)}
                        alt=""
                        sx={{ width: 18, height: 18, flexShrink: 0 }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ minWidth: 0, overflowWrap: "anywhere" }}
                      >
                        {getTypeLabel(locale, type)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: selected
                          ? alpha(theme.palette.info.main, 0.42)
                          : alpha(theme.palette.secondary.main, 0.22),
                        bgcolor: selected
                          ? theme.palette.info.main
                          : "transparent",
                        color: selected
                          ? theme.palette.info.contrastText
                          : "transparent",
                        flexShrink: 0
                      }}
                    >
                      <CheckRoundedIcon sx={{ fontSize: 15 }} />
                    </Box>
                  </Stack>
                </ButtonBase>
              );
            })}
          </Box>
        </DrawerSection>

        <DrawerSection
          eyebrow={strings.filters.button}
          title={strings.filters.deckOptions}
        >
          <Stack spacing={1}>
            <OptionToggleRow
              label={strings.filters.smashPassMode}
              checked={options.smashPassMode}
              onChange={(value) => onChangeOption("smashPassMode", value)}
            />
            <OptionToggleRow
              label={strings.filters.autoReveal}
              checked={options.autoReveal}
              onChange={(value) => onChangeOption("autoReveal", value)}
            />
            <OptionToggleRow
              label={strings.filters.shinyMode}
              checked={options.shinyMode}
              onChange={(value) => onChangeOption("shinyMode", value)}
            />
            <OptionToggleRow
              label={strings.filters.dailyDeck}
              checked={options.dailyDeck}
              onChange={(value) => onChangeOption("dailyDeck", value)}
            />
            <OptionToggleRow
              label={strings.filters.onlyMega}
              checked={options.onlyMega}
              onChange={(value) => onChangeOption("onlyMega", value)}
            />
            <OptionToggleRow
              label={strings.filters.keepHistory}
              checked={options.keepHistory}
              onChange={(value) => onChangeOption("keepHistory", value)}
            />
          </Stack>
        </DrawerSection>

        <DrawerSection title={strings.shell.languageLabel}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={locale}
            onChange={(_, value: "en" | "it" | null) => {
              if (value) setLocale(value);
            }}
            sx={{
              gap: 1,
              "& .MuiToggleButtonGroup-grouped": {
                mr: 0,
                borderRadius: "0 !important",
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.14)} !important`
              },
              "& .MuiToggleButton-root": {
                py: 1,
                fontWeight: 700,
                bgcolor: getBackdropSurface(theme, 0.9)
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
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1
            }}
          >
            <SectionActionButton
              label={strings.filters.exportJson}
              onClick={onExportJson}
              disabled={!favorites.length}
            />
            <SectionActionButton
              label={strings.filters.exportCsv}
              onClick={onExportCsv}
              disabled={!favorites.length}
            />
          </Box>
          <Button
            color="secondary"
            variant="outlined"
            onClick={onShareCard}
            disabled={!favorites.length && !history.smash.length}
            sx={{ alignSelf: "flex-start" }}
          >
            {strings.filters.shareCard}
          </Button>
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
          <Button color="secondary" variant="outlined" onClick={onClearHistory}>
            {strings.filters.clearHistory}
          </Button>
        </DrawerSection>
      </Stack>
    </Drawer>
  );
};
