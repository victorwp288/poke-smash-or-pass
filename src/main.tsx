import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { AppThemeProvider } from "@/app/providers/AppThemeProvider";
import { PwaUpdateProvider } from "@/app/providers/PwaUpdateProvider";
import { ShellProvider } from "@/app/providers/ShellProvider";
import { App } from "@/app/App";
import "@/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <ShellProvider>
            <PwaUpdateProvider>
              <App />
            </PwaUpdateProvider>
          </ShellProvider>
        </BrowserRouter>
      </QueryProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
