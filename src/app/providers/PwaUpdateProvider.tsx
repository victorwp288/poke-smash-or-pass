import React from "react";
import { useLocale } from "@/app/providers/LocaleProvider";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

export const PwaUpdateProvider = ({ children }: { children: React.ReactNode }) => {
  const { locale } = useLocale();

  React.useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast(locale === "it" ? "Aggiornamento disponibile" : "Update available", {
          description:
            locale === "it"
              ? "Una nuova versione di SmashDex e pronta. Ricarica per aggiornare."
              : "A newer version of SmashDex is ready. Reload to update.",
          action: {
            label: locale === "it" ? "Ricarica" : "Reload",
            onClick: () => updateSW(true)
          }
        });
      },
      onOfflineReady() {
        // Optional: toast("Ready for offline use");
      }
    });
  }, [locale]);

  return <>{children}</>;
};
