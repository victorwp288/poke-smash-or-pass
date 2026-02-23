import { Toaster as SonnerToaster } from "sonner";

export const Toaster = () => {
  return (
    <SonnerToaster
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white/90 px-4 py-3 text-foreground shadow-lg backdrop-blur",
          title: "text-sm font-semibold",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background",
          cancelButton:
            "rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
        }
      }}
    />
  );
};
