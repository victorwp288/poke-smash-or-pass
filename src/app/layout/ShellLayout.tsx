import { useShell } from "@/app/providers/ShellProvider";
import { Toaster } from "@/components/ui/sonner";
import { Box, Container } from "@mui/material";
import React from "react";
import { Outlet } from "react-router-dom";

export const ShellLayout = () => {
  const shell = useShell();

  React.useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const updateAppHeight = () => {
      const nextHeight = Math.round(viewport?.height ?? window.innerHeight);
      root.style.setProperty("--app-height", `${nextHeight}px`);
    };

    updateAppHeight();
    window.addEventListener("resize", updateAppHeight);
    window.addEventListener("orientationchange", updateAppHeight);
    viewport?.addEventListener("resize", updateAppHeight);

    return () => {
      window.removeEventListener("resize", updateAppHeight);
      window.removeEventListener("orientationchange", updateAppHeight);
      viewport?.removeEventListener("resize", updateAppHeight);
    };
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        shell.setHelpOpen(true);
      }
      if (event.key === "Escape") {
        shell.setHelpOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shell]);

  return (
    <Box
      sx={{
        minHeight: "var(--app-height, 100dvh)",
        display: "flex",
        flexDirection: "column",
        overflowX: "clip",
        pb: 0
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          px: 0,
          pt: { xs: "env(safe-area-inset-top)", md: 0 }
        }}
      >
        <Box
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            width: "100%"
          }}
        >
          <Outlet />
        </Box>
      </Container>
      <Toaster />
    </Box>
  );
};
