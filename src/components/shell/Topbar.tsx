import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useShell } from "@/app/providers/ShellProvider";
import { cn } from "@/lib/utils";
import { HelpDialog } from "@/components/shell/HelpDialog";

const navItems = [
  { to: "/smash", label: "Smash / Pass" },
  { to: "/guess", label: "GuessDex" },
  { to: "/type-clash", label: "Type Clash" },
  { to: "/silhouette-blitz", label: "Silhouette Blitz" },
  { to: "/dex-rush", label: "Dex Rush" }
];

export const Topbar = () => {
  const shell = useShell();
  const location = useLocation();

  const { setScoreboard, setStatus } = shell;

  React.useEffect(() => {
    // Reset route-specific UI slots when navigating.
    setScoreboard(null);
    setStatus("Ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <header className="border-b bg-white/60 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 lg:grid-cols-[auto,1fr,auto] lg:items-center">
        <div>
          <div className="font-display text-xl tracking-wide">SmashDex</div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {shell.header.category ?? "Pokemon Arcade"}
          </div>
        </div>

        <nav className="overflow-x-auto" aria-label="Game modes">
          <div className="inline-flex gap-2 rounded-full border bg-white/70 p-1 shadow-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition",
                    isActive
                      ? "bg-gradient-to-br from-amber-100 to-orange-100 text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
                aria-label={`Open ${item.label}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,auto] sm:items-center sm:justify-end">
          <div className="inline-flex w-full items-center justify-center rounded-full border bg-white/70 px-3 py-2 text-[11px] font-bold uppercase tracking-wider shadow-sm sm:w-auto">
            {shell.status}
          </div>
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            {shell.scoreboard}
            <HelpDialog />
          </div>
        </div>
      </div>
    </header>
  );
};
