import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import { Box, Button, Paper, alpha } from "@mui/material";

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
  return (
    <Box
      sx={{
        position: { xs: "sticky", md: "static" },
        bottom: { xs: "calc(env(safe-area-inset-bottom) + 12px)", md: "auto" },
        zIndex: 8,
        px: { xs: 1.5, sm: 2, md: 0 },
        py: { xs: 1.25, md: 0.5 }
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 0.9, sm: 1.1 },
          borderRadius: "999px",
          bgcolor: "background.paper",
          borderColor: "divider",
          boxShadow: "0 18px 32px rgba(15, 23, 42, 0.12)"
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
                  bgcolor: alpha("#d92d20", 0.08)
                }
              }}
            >
              Pass
            </Button>
          ) : null}

          <Button
            color="secondary"
            variant="contained"
            startIcon={<ShuffleRoundedIcon />}
            onClick={onShuffle}
            disabled={disabled || isShuffling}
            sx={{
              justifySelf: "center",
              minWidth: { xs: 132, sm: 156 },
              px: { xs: 2, sm: 2.5 },
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.18)",
              borderRadius: "999px"
            }}
          >
            {isShuffling ? "Shuffling" : "Shuffle"}
          </Button>

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
                  bgcolor: alpha("#039855", 0.08)
                }
              }}
            >
              Smash
            </Button>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
};
