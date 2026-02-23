import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useShell } from "@/app/providers/ShellProvider";

export const HelpDialog = () => {
  const shell = useShell();

  return (
    <Dialog open={shell.helpOpen} onOpenChange={shell.setHelpOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Open help"
          title="Help"
        >
          ?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shell.help.title ?? "Help"}</DialogTitle>
        </DialogHeader>
        <div className="mt-3">{shell.help.body}</div>
      </DialogContent>
    </Dialog>
  );
};
