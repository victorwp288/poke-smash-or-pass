import { alpha } from "@mui/material";
import type { Theme } from "@mui/material/styles";

export type AppThemeMode = "light" | "dark";

export const APP_THEME_STORAGE_KEY = "smashdex-theme-mode";
export const LIGHT_THEME_COLOR = "#f7f9fc";
export const DARK_THEME_COLOR = "#0f1a20";

export const parseAppThemeMode = (value: unknown): AppThemeMode => {
  return value === "dark" ? "dark" : "light";
};

export const getPreferredAppThemeMode = (): AppThemeMode => {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
};

export const getFrostedSurface = (theme: Theme, opacity = 0.92) => {
  return alpha(
    theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.common.white,
    opacity
  );
};

export const getBackdropSurface = (theme: Theme, opacity = 0.9) => {
  return alpha(
    theme.palette.mode === "dark"
      ? theme.palette.background.default
      : theme.palette.common.white,
    opacity
  );
};

export const getContrastOverlay = (theme: Theme, opacity = 0.12) => {
  return alpha(
    theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.common.black,
    opacity
  );
};
