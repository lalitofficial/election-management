"use client";

import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { ReactNode, useMemo } from "react";

const themeOptions = {
  cssVariables: true,
  shape: {
    borderRadius: 16,
  },
  palette: {
    mode: "light" as const,
    primary: {
      main: "#1a73e8",
    },
    secondary: {
      main: "#5f6368",
    },
    background: {
      default: "#f6f8fc",
      paper: "#ffffff",
    },
    success: {
      main: "#188038",
    },
    error: {
      main: "#d93025",
    },
    warning: {
      main: "#ea8600",
    },
  },
  typography: {
    fontFamily: "var(--font-roboto), sans-serif",
    h1: {
      fontWeight: 500,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    button: {
      textTransform: "none" as const,
      fontWeight: 500,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: "transparent" as const,
        elevation: 0,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: "0 1px 2px rgba(60,64,67,0.16), 0 1px 3px 1px rgba(60,64,67,0.08)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small" as const,
        variant: "outlined" as const,
      },
    },
  },
};

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(() => createTheme(themeOptions), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
