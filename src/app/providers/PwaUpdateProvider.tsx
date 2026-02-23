import React from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

export const PwaUpdateProvider = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast("Update available", {
          description: "A newer version of SmashDex is ready. Reload to update.",
          action: {
            label: "Reload",
            onClick: () => updateSW(true)
          }
        });
      },
      onOfflineReady() {
        // Optional: toast("Ready for offline use");
      }
    });
  }, []);

  return <>{children}</>;
};
