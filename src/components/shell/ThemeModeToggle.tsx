import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { Button, Tooltip, alpha, useTheme } from "@mui/material";
import { useLocale } from "@/app/providers/LocaleProvider";
import { useAppTheme } from "@/app/providers/useAppTheme";
import { getBackdropSurface } from "@/lib/theme";

export const ThemeModeToggle = ({
  fullWidth = false,
  justifyContent = "center"
}: {
  fullWidth?: boolean;
  justifyContent?: "center" | "flex-start";
}) => {
  const { isDarkMode, toggleMode } = useAppTheme();
  const { strings } = useLocale();
  const theme = useTheme();

  const label = isDarkMode ? strings.shell.lightMode : strings.shell.darkMode;
  const ariaLabel = isDarkMode
    ? strings.shell.switchToLight
    : strings.shell.switchToDark;

  return (
    <Tooltip title={ariaLabel}>
      <Button
        size="small"
        color="secondary"
        variant="outlined"
        startIcon={
          isDarkMode ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />
        }
        onClick={toggleMode}
        aria-label={ariaLabel}
        sx={{
          width: fullWidth ? "100%" : "auto",
          minWidth: fullWidth ? undefined : 142,
          justifyContent,
          borderColor: alpha(theme.palette.secondary.main, 0.18),
          bgcolor: getBackdropSurface(theme, 0.72),
          backdropFilter: "blur(10px)",
          "&:hover": {
            borderColor: alpha(theme.palette.secondary.main, 0.28),
            bgcolor: getBackdropSurface(theme, 0.88)
          }
        }}
      >
        {label}
      </Button>
    </Tooltip>
  );
};
