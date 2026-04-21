import { fetchGenerationRosterEntries, type GenerationRosterEntry } from "@/lib/pokeapi/api";
import { useLocale } from "@/app/providers/LocaleProvider";
import { capitalize, formatId, normalizeGuessToken } from "@/lib/text";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

const GEN_TOTAL = 9;
const ROSTER_STALE_MS = 1000 * 60 * 60 * 24;

type PokemonPickerTab = "all" | number;
type GenerationRosterMap = Partial<Record<number, GenerationRosterEntry[]>>;

const buildGenerationMap = (groups: GenerationRosterEntry[][]) =>
  groups.reduce<GenerationRosterMap>((map, entries, index) => {
    map[index + 1] = entries;
    return map;
  }, {});

export const PokemonPickerModal = ({
  open,
  currentPokemonName,
  onClose,
  onSelectPokemon
}: {
  open: boolean;
  currentPokemonName: string;
  onClose: () => void;
  onSelectPokemon: (name: string) => void;
}) => {
  const { strings } = useLocale();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<PokemonPickerTab>("all");
  const [searchValue, setSearchValue] = React.useState("");
  const [rosters, setRosters] = React.useState<GenerationRosterMap>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const requestTokenRef = React.useRef(0);

  const loadRosters = React.useCallback(async () => {
    const token = ++requestTokenRef.current;
    setIsLoading(true);
    setLoadError("");

    try {
      const groups = await Promise.all(
        Array.from({ length: GEN_TOTAL }, (_, index) => {
          const genId = index + 1;
          return queryClient.fetchQuery<GenerationRosterEntry[]>({
            queryKey: ["generation-roster-entries", genId],
            queryFn: () => fetchGenerationRosterEntries(genId),
            staleTime: ROSTER_STALE_MS
          });
        })
      );

      if (token !== requestTokenRef.current) return;
      setRosters(buildGenerationMap(groups));
      setIsLoading(false);
    } catch {
      if (token !== requestTokenRef.current) return;
      setLoadError(strings.picker.listUnavailableBody);
      setIsLoading(false);
    }
  }, [queryClient, strings.picker.listUnavailableBody]);

  React.useEffect(() => {
    if (!open) return;
    setActiveTab("all");
    setSearchValue("");
    void loadRosters();
  }, [loadRosters, open]);

  const allEntries = React.useMemo(
    () =>
      Array.from({ length: GEN_TOTAL }, (_, index) => rosters[index + 1] ?? [])
        .flat()
        .sort((a, b) => {
          if (a.generation !== b.generation) return a.generation - b.generation;
          const idOrder =
            (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
          if (idOrder !== 0) return idOrder;
          return a.name.localeCompare(b.name);
        }),
    [rosters]
  );

  const baseEntries = React.useMemo(() => {
    if (activeTab === "all") return allEntries;
    return rosters[activeTab] ?? [];
  }, [activeTab, allEntries, rosters]);

  const normalizedSearch = React.useMemo(
    () => normalizeGuessToken(searchValue),
    [searchValue]
  );

  const filteredEntries = React.useMemo(() => {
    if (!normalizedSearch) return baseEntries;
    const numericSearch = searchValue.replace(/[^0-9]/g, "");

    return baseEntries.filter((entry) => {
      const nameMatch = normalizeGuessToken(entry.name).includes(normalizedSearch);
      if (nameMatch) return true;
      if (!numericSearch) return false;
      return String(entry.id ?? "").includes(numericSearch);
    });
  }, [baseEntries, normalizedSearch, searchValue]);

  const currentKey = normalizeGuessToken(currentPokemonName);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          background: `radial-gradient(circle at top, ${alpha(
            theme.palette.info.main,
            0.14
          )} 0%, transparent 28%), linear-gradient(180deg, ${alpha(
            theme.palette.common.white,
            0.98
          )} 0%, ${theme.palette.background.paper} 50%, ${alpha(
            theme.palette.secondary.light,
            0.18
          )} 100%)`
        }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            borderBottom: "1px solid",
            borderColor: alpha(theme.palette.text.primary, 0.12),
            bgcolor: alpha(theme.palette.common.white, 0.84),
            backdropFilter: "blur(14px)"
          }}
        >
          <Stack spacing={1.75}>
            <Stack
              direction="row"
              spacing={1.5}
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h3">{strings.picker.title}</Typography>
              <IconButton
                aria-label={strings.picker.close}
                onClick={onClose}
                sx={{
                  border: "1px solid",
                  borderColor: alpha(theme.palette.secondary.main, 0.14),
                  bgcolor: alpha(theme.palette.common.white, 0.72),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.secondary.main, 0.08)
                  }
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </Stack>

            <TextField
              autoFocus
              fullWidth
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={strings.picker.searchPlaceholder}
              inputProps={{ "aria-label": strings.picker.searchAria }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0,
                  bgcolor: alpha(theme.palette.common.white, 0.94),
                  transition: theme.transitions.create([
                    "background-color",
                    "border-color",
                    "box-shadow"
                  ]),
                  "& fieldset": {
                    borderColor: alpha(theme.palette.secondary.main, 0.14)
                  },
                  "&:hover fieldset": {
                    borderColor: alpha(theme.palette.secondary.main, 0.22)
                  },
                  "&.Mui-focused": {
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.info.main, 0.12)}`
                  }
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", p: 0 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            borderBottom: "1px solid",
            borderColor: alpha(theme.palette.text.primary, 0.12),
            bgcolor: alpha(theme.palette.common.white, 0.9),
            backdropFilter: "blur(14px)"
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value: PokemonPickerTab) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              px: { xs: 1, sm: 1.5 },
              minHeight: 60,
              "& .MuiTabs-indicator": {
                height: 3,
                backgroundColor: theme.palette.info.main
              },
              "& .MuiTab-root": {
                minHeight: 60,
                paddingInline: 16,
                textTransform: "none",
                fontWeight: 700,
                color: theme.palette.text.secondary,
                transition: theme.transitions.create([
                  "background-color",
                  "color"
                ]),
                "&.Mui-selected": {
                  color: theme.palette.text.primary,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.07)
                }
              }
            }}
          >
            <Tab label={strings.picker.allPokemon} value="all" />
            {Array.from({ length: GEN_TOTAL }, (_, index) => {
              const genId = index + 1;
              return <Tab key={genId} label={`Gen ${genId}`} value={genId} />;
            })}
          </Tabs>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 0,
            py: 0,
            bgcolor: theme.palette.common.white
          }}
        >
          {isLoading ? (
            <Stack
              spacing={1.5}
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: "45dvh" }}
            >
              <CircularProgress color="secondary" />
              <Typography color="text.secondary">
                {strings.picker.buildingList}
              </Typography>
            </Stack>
          ) : loadError ? (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 0,
                p: 3,
                maxWidth: 420,
                mx: "auto",
                mt: 6
              }}
            >
              <Stack spacing={1.5} alignItems="flex-start">
                <Typography variant="h4">{strings.picker.listUnavailable}</Typography>
                <Typography color="text.secondary">{loadError}</Typography>
                <Button variant="contained" onClick={() => void loadRosters()}>
                  {strings.common.tryAgain}
                </Button>
              </Stack>
            </Paper>
          ) : filteredEntries.length ? (
            <Stack sx={{ px: 0, py: 0 }}>
              {filteredEntries.map((entry) => {
                const isCurrent =
                  normalizeGuessToken(entry.name) === currentKey;
                const showDivider = entry !== filteredEntries[filteredEntries.length - 1];

                return (
                  <Button
                    key={`${entry.generation}-${entry.name}`}
                    fullWidth
                    onClick={() => onSelectPokemon(entry.name)}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                      minHeight: { xs: 84, sm: 90 },
                      px: { xs: 2, sm: 3 },
                      py: 2.2,
                      borderRadius: 0,
                      textTransform: "none",
                      bgcolor: alpha(theme.palette.common.white, 0.84),
                      color: "text.primary",
                      borderTop: showDivider ? "1px solid" : "none",
                      borderBottom: "1px solid",
                      borderLeft: "none",
                      borderRight: "none",
                      borderColor: isCurrent
                        ? alpha(theme.palette.info.main, 0.32)
                        : alpha(theme.palette.secondary.main, 0.12),
                      boxShadow: isCurrent
                        ? `inset 4px 0 0 ${theme.palette.info.main}`
                        : "none",
                      transition: theme.transitions.create([
                        "background-color",
                        "border-color",
                        "box-shadow",
                        "transform"
                      ]),
                      "&:hover": {
                        bgcolor: alpha(theme.palette.info.main, 0.06),
                        borderColor: alpha(theme.palette.info.main, 0.22)
                      },
                      "&:active": {
                        transform: "translateY(1px)"
                      }
                    }}
                  >
                    <Stack
                      spacing={0.55}
                      sx={{ minWidth: 0, flex: 1, textAlign: "left" }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
                        >
                          {entry.id ? formatId(entry.id) : strings.picker.unknown}
                        </Typography>
                        {entry.generation ? (
                          <Typography
                            variant="caption"
                            sx={{
                              px: 0.75,
                              py: 0.15,
                              bgcolor: alpha(theme.palette.secondary.main, 0.06),
                              color: "text.secondary",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase"
                            }}
                          >
                            {strings.card.generationShort(entry.generation)}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {capitalize(entry.name)}
                      </Typography>
                    </Stack>
                    <ChevronRightRoundedIcon
                      sx={{
                        color: isCurrent ? "info.main" : "text.secondary",
                        flexShrink: 0
                      }}
                    />
                  </Button>
                );
              })}
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 0,
                p: 3,
                maxWidth: 420,
                mx: "auto",
                mt: 6
              }}
            >
              <Stack spacing={1}>
                <Typography variant="h4">{strings.picker.noMatches}</Typography>
                <Typography color="text.secondary">
                  {strings.picker.noMatchesBody}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
