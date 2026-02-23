import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Topbar } from "@/components/shell/Topbar";
import { useShell } from "@/app/providers/ShellProvider";

export const ShellLayout = () => {
  const shell = useShell();

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
    <div className="min-h-dvh bg-[radial-gradient(circle_at_10%_10%,rgba(255,107,45,0.20),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(30,166,177,0.18),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(255,212,71,0.22),transparent_45%),linear-gradient(135deg,var(--bg-0),var(--bg-1))] text-foreground">
      <Topbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
};
