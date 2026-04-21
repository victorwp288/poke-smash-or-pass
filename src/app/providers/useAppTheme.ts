import React from "react";
import { type AppThemeMode } from "@/lib/theme";

export type AppThemeContextValue = {
  mode: AppThemeMode;
  isDarkMode: boolean;
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
};

export const AppThemeContext = React.createContext<AppThemeContextValue | null>(
  null
);

export const useAppTheme = () => {
  const context = React.useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
};
