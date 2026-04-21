import { useLocale } from "@/app/providers/LocaleProvider";
import { TYPE_COLORS } from "@/lib/constants";
import { getTypeLabel } from "@/lib/i18n/it";
import type { PokemonMoveSpotlight } from "@/lib/pokeapi/types";
import { capitalize } from "@/lib/text";
import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme
} from "@mui/material";

type MoveSpotlightProps = {
  moves: PokemonMoveSpotlight[];
  loading?: boolean;
};

const formatBadgeValue = (value: number | null) =>
  Number.isFinite(Number(value)) ? String(value) : "—";

const getDamageClassLabel = (
  damageClass: PokemonMoveSpotlight["damageClass"],
  strings: ReturnType<typeof useLocale>["strings"]
) => {
  switch (damageClass) {
    case "physical":
      return strings.card.physical;
    case "special":
      return strings.card.special;
    case "status":
      return strings.card.status;
    default:
      return capitalize(damageClass);
  }
};

const getLearnMethodLabel = (
  move: PokemonMoveSpotlight,
  strings: ReturnType<typeof useLocale>["strings"]
) => {
  switch (move.learnMethod) {
    case "level-up":
      return strings.card.learnedByLevel(move.levelLearnedAt || 0);
    case "machine":
      return strings.card.learnedByMachine;
    case "tutor":
      return strings.card.learnedByTutor;
    case "egg":
      return strings.card.learnedByEgg;
    default:
      return strings.card.learnedBySpecial;
  }
};

const MetricBadge = ({ label, value }: { label: string; value: string }) => (
  <Stack
    spacing={0.2}
    sx={{
      px: 0.9,
      py: 0.6,
      minWidth: 54,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "background.paper"
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ lineHeight: 1, textTransform: "uppercase", letterSpacing: 0.8 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.1 }}>
      {value}
    </Typography>
  </Stack>
);

export const MoveSpotlight = ({
  moves,
  loading = false
}: MoveSpotlightProps) => {
  const { locale, strings } = useLocale();
  const theme = useTheme();

  if (!loading && !moves.length) return null;

  return (
    <Stack spacing={1.1} data-card-swipe-ignore="true">
      <Stack spacing={0.25}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: 1.1, textTransform: "uppercase" }}
        >
          {strings.card.fieldNotes}
        </Typography>
        <Typography variant="subtitle2">
          {strings.card.battleIdentity}
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1
        }}
      >
        {loading
          ? Array.from({ length: 2 }, (_, index) => (
              <Paper
                key={`move-skeleton-${index}`}
                variant="outlined"
                sx={{ p: 1.2, borderRadius: 0 }}
              >
                <Stack spacing={0.9}>
                  <Skeleton variant="rectangular" height={18} width="62%" />
                  <Skeleton variant="rectangular" height={24} width="42%" />
                  <Stack direction="row" spacing={0.75}>
                    <Skeleton variant="rectangular" height={42} width={56} />
                    <Skeleton variant="rectangular" height={42} width={56} />
                    <Skeleton variant="rectangular" height={42} width={56} />
                  </Stack>
                  <Skeleton variant="rectangular" height={16} width="100%" />
                  <Skeleton variant="rectangular" height={16} width="78%" />
                </Stack>
              </Paper>
            ))
          : moves.map((move) => {
              const accent =
                TYPE_COLORS[move.type] || theme.palette.secondary.main;

              return (
                <Paper
                  key={move.name}
                  variant="outlined"
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 0,
                    p: 1.2,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.background.paper, 0.96)
                        : alpha(theme.palette.background.paper, 0.98)
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      insetInline: 0,
                      top: 0,
                      height: 3,
                      bgcolor: accent
                    }}
                  />

                  <Stack spacing={0.95}>
                    <Stack spacing={0.75}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Typography
                          variant="body1"
                          fontWeight={800}
                          sx={{ overflowWrap: "anywhere", pr: 1 }}
                        >
                          {move.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={getDamageClassLabel(move.damageClass, strings)}
                          sx={{
                            bgcolor: alpha(accent, 0.14),
                            color: "text.primary",
                            flexShrink: 0
                          }}
                        />
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.75}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Chip
                          size="small"
                          label={getTypeLabel(locale, move.type)}
                          sx={{
                            bgcolor: alpha(accent, 0.18),
                            color: "text.primary"
                          }}
                        />
                        {move.isStab ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={strings.card.stab}
                          />
                        ) : null}
                        {move.priority > 0 ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={strings.card.priorityValue(move.priority)}
                          />
                        ) : null}
                      </Stack>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <MetricBadge
                        label={strings.card.movePower}
                        value={formatBadgeValue(move.power)}
                      />
                      <MetricBadge
                        label={strings.card.moveAccuracy}
                        value={formatBadgeValue(move.accuracy)}
                      />
                      <MetricBadge
                        label={strings.card.movePp}
                        value={formatBadgeValue(move.pp)}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {move.shortEffect || strings.card.noMoveDescription}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ letterSpacing: 0.4, textTransform: "uppercase" }}
                    >
                      {getLearnMethodLabel(move, strings)}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
      </Box>
    </Stack>
  );
};
