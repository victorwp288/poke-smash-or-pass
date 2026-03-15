import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import { Box, Button, Paper } from "@mui/material";

export const ActionRow = ({
  disabled,
  isShuffling,
  onPass,
  onSmash,
  onShuffle
}: {
  disabled: boolean;
  isShuffling: boolean;
  onPass: () => void;
  onSmash: () => void;
  onShuffle: () => void;
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        position: { xs: "sticky", md: "static" },
        bottom: { xs: "env(safe-area-inset-bottom)", md: "auto" },
        zIndex: 8,
        mt: 0,
        p: 0,
        overflow: "hidden",
        borderRadius: 0,
        bgcolor: "background.paper",
        borderColor: "divider",
        boxShadow: "none"
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(3, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))"
          },
          gap: 0,
          "& > *": {
            borderRadius: 0,
            minHeight: { xs: 52, sm: 56 }
          }
        }}
      >
        <Button
          color="error"
          variant="contained"
          startIcon={<CloseRoundedIcon />}
          onClick={onPass}
          disabled={disabled}
          sx={{
            width: "100%",
            borderRight: "1px solid",
            borderColor: "divider"
          }}
        >
          Pass
        </Button>
        <Button
          color="secondary"
          variant="outlined"
          startIcon={<ShuffleRoundedIcon />}
          onClick={onShuffle}
          disabled={disabled || isShuffling}
          sx={{
            width: "100%",
            borderRight: "1px solid",
            borderColor: "divider"
          }}
        >
          {isShuffling ? "Shuffling" : "Shuffle"}
        </Button>
        <Button
          color="success"
          variant="contained"
          startIcon={<FavoriteRoundedIcon />}
          onClick={onSmash}
          disabled={disabled}
          sx={{
            width: "100%",
            borderColor: "divider"
          }}
        >
          Smash
        </Button>
      </Box>
    </Paper>
  );
};
