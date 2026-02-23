import React from "react";

type ShellHeader = {
  title?: string;
  category?: string;
};

type ShellHelp = {
  title?: string;
  body?: React.ReactNode;
};

type ShellContextValue = {
  status: string;
  header: ShellHeader;
  scoreboard: React.ReactNode;
  help: ShellHelp;
  helpOpen: boolean;
  setStatus: (text: string) => void;
  setHeader: (header: ShellHeader) => void;
  setScoreboard: (node: React.ReactNode) => void;
  setHelp: (help: ShellHelp) => void;
  setHelpOpen: (open: boolean) => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export const ShellProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = React.useState("Ready");
  const [header, setHeader] = React.useState<ShellHeader>({
    title: "SmashDex",
    category: "Pokemon Arcade"
  });
  const [scoreboard, setScoreboard] = React.useState<React.ReactNode>(null);
  const [help, setHelp] = React.useState<ShellHelp>({
    title: "Controls",
    body: (
      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">Navigate</span>
          <span className="text-muted-foreground">Use the tabs</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">PWA</span>
          <span className="text-muted-foreground">Install from browser menu</span>
        </div>
      </div>
    )
  });
  const [helpOpen, setHelpOpen] = React.useState(false);

  const value = React.useMemo<ShellContextValue>(
    () => ({
      status,
      header,
      scoreboard,
      help,
      helpOpen,
      setStatus,
      setHeader,
      setScoreboard,
      setHelp,
      setHelpOpen
    }),
    [status, header, scoreboard, help, helpOpen]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

export const useShell = () => {
  const ctx = React.useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return ctx;
};
