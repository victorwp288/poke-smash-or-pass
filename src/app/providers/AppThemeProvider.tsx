import {
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  alpha,
  createTheme
} from "@mui/material";
import React from "react";

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#d92d20",
      light: "#f97066",
      dark: "#b42318",
      contrastText: "#fcfcfd"
    },
    secondary: {
      main: "#344054",
      light: "#667085",
      dark: "#182230",
      contrastText: "#fcfcfd"
    },
    success: {
      main: "#15803d"
    },
    error: {
      main: "#d92d20"
    },
    warning: {
      main: "#d97706"
    },
    info: {
      main: "#2563eb"
    },
    background: {
      default: "#dce3ea",
      paper: "#f7f9fc"
    },
    text: {
      primary: "#101828",
      secondary: "#475467"
    },
    divider: "rgba(16, 24, 40, 0.14)"
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
          minHeight: "100dvh",
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
          backgroundColor: "#f7f9fc",
          backgroundImage: "none",
          borderColor: "rgba(16, 24, 40, 0.14)"
        }
      }
    }
  }
});

export const AppThemeProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={(theme) => ({
          ":root": {
            colorScheme: "light"
          },
          body: {
            background: "linear-gradient(180deg, #e8edf3 0%, #dce3ea 100%)",
            color: theme.palette.text.primary
          },
          "#root": {
            minHeight: "100dvh"
          },
          "::selection": {
            backgroundColor: alpha(theme.palette.primary.main, 0.22)
          }
        })}
      />
      {children}
    </ThemeProvider>
  );
};
