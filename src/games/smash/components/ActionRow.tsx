import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import { useLocale } from "@/app/providers/LocaleProvider";
import { Box, Button, Paper, alpha, keyframes, useTheme } from "@mui/material";

const pokeballSpin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const actionRowShellSx = {
  position: { xs: "sticky", md: "static" },
  bottom: { xs: "calc(env(safe-area-inset-bottom) + 12px)", md: "auto" },
  zIndex: 8,
  px: { xs: 1.5, sm: 2, md: 0 },
  py: { xs: 1.25, md: 0.5 }
} as const;

const PokeballLoader = () => {
  const theme = useTheme();
  const stroke =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.82)
      : "#101828";
  const bottom =
    theme.palette.mode === "dark" ? theme.palette.background.paper : "#fffaf2";

  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "relative",
        width: { xs: 42, sm: 48 },
        height: { xs: 42, sm: 48 },
        borderRadius: "50%",
        border: "2px solid",
        borderColor: stroke,
        background: `linear-gradient(180deg, #e5483d 0 46%, ${stroke} 46% 54%, ${bottom} 54% 100%)`,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 12px 24px rgba(0, 0, 0, 0.28)"
            : "0 12px 24px rgba(15, 23, 42, 0.16)",
        animation: `${pokeballSpin} 1.05s linear infinite`
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "50% auto auto 50%",
          width: "34%",
          height: "34%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: "2px solid",
          borderColor: stroke,
          bgcolor: bottom,
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 0 0 2px rgba(255,255,255,0.14)"
              : "0 0 0 2px rgba(255,255,255,0.24)"
        }}
      />
    </Box>
  );
};

export const ActionRow = ({
  disabled,
  isShuffling,
  votingEnabled,
  onPass,
  onSmash,
  onShuffle
}: {
  disabled: boolean;
  isShuffling: boolean;
  votingEnabled: boolean;
  onPass: () => void;
  onSmash: () => void;
  onShuffle: () => void;
}) => {
  const { strings } = useLocale();
  const theme = useTheme();

  const shuffleButton = (
    <Button
      color="secondary"
      variant="contained"
      startIcon={<ShuffleRoundedIcon />}
      onClick={onShuffle}
      disabled={disabled}
      sx={{
        justifySelf: "center",
        minWidth: { xs: 132, sm: 156 },
        px: { xs: 2, sm: 2.5 },
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 12px 24px rgba(0, 0, 0, 0.28)"
            : "0 12px 24px rgba(15, 23, 42, 0.18)",
        borderRadius: "999px"
      }}
    >
      {strings.actionRow.shuffle}
    </Button>
  );

  if (isShuffling) {
    return (
      <Box
        sx={{
          ...actionRowShellSx,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: { xs: 74, sm: 82 }
        }}
      >
        <PokeballLoader />
      </Box>
    );
  }

  if (!votingEnabled) {
    return (
      <Box
        sx={{
          ...actionRowShellSx,
          display: "flex",
          justifyContent: "center"
        }}
      >
        {shuffleButton}
      </Box>
    );
  }

  return (
    <Box sx={actionRowShellSx}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 0.9, sm: 1.1 },
          borderRadius: "999px",
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow:
            theme.palette.mode === "dark"
              ? "0 18px 32px rgba(0, 0, 0, 0.32)"
              : "0 18px 32px rgba(15, 23, 42, 0.12)"
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: votingEnabled
              ? "minmax(0, 1fr) auto minmax(0, 1fr)"
              : "auto",
            gap: { xs: 0.5, sm: 0.75 },
            alignItems: "center",
            justifyContent: "center",
            "& > *": {
              minHeight: { xs: 50, sm: 56 },
              borderRadius: "999px"
            }
          }}
        >
          {votingEnabled ? (
            <Button
              color="error"
              variant="text"
              startIcon={<CloseRoundedIcon />}
              onClick={onPass}
              disabled={disabled}
              sx={{
                borderRadius: "999px",
                width: "100%",
                px: { xs: 1.25, sm: 1.75 },
                fontWeight: 700,
                color: "error.main",
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.12)
                }
              }}
            >
              {strings.actionRow.pass}
            </Button>
          ) : null}

          {shuffleButton}

          {votingEnabled ? (
            <Button
              color="success"
              variant="text"
              startIcon={<FavoriteRoundedIcon />}
              onClick={onSmash}
              disabled={disabled}
              sx={{
                width: "100%",
                px: { xs: 1.25, sm: 1.75 },
                fontWeight: 700,
                borderRadius: "999px",
                color: "success.main",
                "&:hover": {
                  bgcolor: alpha(theme.palette.success.main, 0.12)
                }
              }}
            >
              {strings.actionRow.smash}
            </Button>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
};
