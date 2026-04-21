import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  alpha,
  createTheme
} from "@mui/material";
import React from "react";
import { useLocalStorageState } from "@/lib/storage";
import {
  APP_THEME_STORAGE_KEY,
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  getPreferredAppThemeMode,
  parseAppThemeMode,
  type AppThemeMode
} from "@/lib/theme";
import { AppThemeContext, type AppThemeContextValue } from "./useAppTheme";

const createAppTheme = (mode: AppThemeMode) => {
  const isDarkMode = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDarkMode ? "#ff7a59" : "#d92d20",
        light: isDarkMode ? "#ffb089" : "#f97066",
        dark: isDarkMode ? "#d45f41" : "#b42318",
        contrastText: isDarkMode ? "#071117" : "#fcfcfd"
      },
      secondary: {
        main: isDarkMode ? "#b8c7d4" : "#344054",
        light: isDarkMode ? "#dce6ee" : "#667085",
        dark: isDarkMode ? "#93a5b6" : "#182230",
        contrastText: isDarkMode ? "#091117" : "#fcfcfd"
      },
      success: {
        main: isDarkMode ? "#32d583" : "#15803d",
        contrastText: isDarkMode ? "#071117" : "#fcfcfd"
      },
      error: {
        main: isDarkMode ? "#f97066" : "#d92d20",
        contrastText: isDarkMode ? "#071117" : "#fcfcfd"
      },
      warning: {
        main: isDarkMode ? "#fdb022" : "#d97706",
        contrastText: isDarkMode ? "#071117" : "#fcfcfd"
      },
      info: {
        main: isDarkMode ? "#53b1fd" : "#2563eb",
        contrastText: isDarkMode ? "#071117" : "#fcfcfd"
      },
      background: {
        default: isDarkMode ? "#0f1a20" : "#dce3ea",
        paper: isDarkMode ? "#15242c" : "#f7f9fc"
      },
      text: {
        primary: isDarkMode ? "#f2f6f8" : "#101828",
        secondary: isDarkMode ? "#b7c4ce" : "#475467"
      },
      divider: isDarkMode
        ? "rgba(226, 232, 240, 0.16)"
        : "rgba(16, 24, 40, 0.14)"
    },
    shape: {
      borderRadius: 0
    },
    spacing: 8,
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      h1: {
        fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
        fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
        lineHeight: 1.04,
        letterSpacing: "0.04em"
      },
      h2: {
        fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
        fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
        lineHeight: 1.08,
        letterSpacing: "0.03em"
      },
      h3: {
        fontFamily: '"Bungee", "Trebuchet MS", sans-serif',
        fontSize: "1.1rem",
        lineHeight: 1.15,
        letterSpacing: "0.04em"
      },
      button: {
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "none"
      },
      overline: {
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase"
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            minHeight: "var(--app-height, 100dvh)",
            overflowX: "hidden",
            backgroundAttachment: "scroll",
            WebkitTextSizeAdjust: "100%",
            "@media (min-width:900px)": {
              backgroundAttachment: "fixed"
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backdropFilter: "none"
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none"
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            paddingInline: 18,
            minHeight: 42
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            fontWeight: 700
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDarkMode ? "#15242c" : "#f7f9fc",
            backgroundImage: "none",
            borderColor: isDarkMode
              ? "rgba(226, 232, 240, 0.16)"
              : "rgba(16, 24, 40, 0.14)"
          }
        }
      }
    }
  });
};

export const AppThemeProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const initialMode = React.useMemo(() => getPreferredAppThemeMode(), []);
  const [mode, setModeState] = useLocalStorageState<AppThemeMode>(
    APP_THEME_STORAGE_KEY,
    initialMode,
    { parse: parseAppThemeMode }
  );

  const setMode = React.useCallback(
    (nextMode: AppThemeMode) => {
      setModeState(nextMode);
    },
    [setModeState]
  );

  const toggleMode = React.useCallback(() => {
    setModeState((currentMode) => (currentMode === "dark" ? "light" : "dark"));
  }, [setModeState]);

  const theme = React.useMemo(() => createAppTheme(mode), [mode]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorScheme = mode;
    root.classList.toggle("dark", mode === "dark");

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    themeColorMeta?.setAttribute(
      "content",
      mode === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
  }, [mode]);

  const value = React.useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDarkMode: mode === "dark",
      setMode,
      toggleMode
    }),
    [mode, setMode, toggleMode]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={(currentTheme) => ({
            ":root": {
              colorScheme: mode
            },
            html: {
              backgroundColor: currentTheme.palette.background.default
            },
            body: {
              backgroundColor: currentTheme.palette.background.default,
              color: currentTheme.palette.text.primary,
              minHeight: "var(--app-height, 100dvh)",
              transition: currentTheme.transitions.create(
                ["background-color", "color"],
                { duration: currentTheme.transitions.duration.shorter }
              )
            },
            "#root": {
              minHeight: "var(--app-height, 100dvh)",
              backgroundColor: currentTheme.palette.background.default
            },
            "::selection": {
              backgroundColor: alpha(currentTheme.palette.primary.main, 0.22)
            }
          })}
        />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
};
