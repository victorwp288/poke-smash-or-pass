import { Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/app/layout/ShellLayout";
import { SmashPage } from "@/games/smash/SmashPage";
import { GuessPage } from "@/games/guess/GuessPage";
import { TypeClashPage } from "@/games/type-clash/TypeClashPage";
import { SilhouetteBlitzPage } from "@/games/silhouette-blitz/SilhouetteBlitzPage";
import { DexRushPage } from "@/games/dex-rush/DexRushPage";

export const App = () => {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<Navigate to="/smash" replace />} />
        <Route path="/smash" element={<SmashPage />} />
        <Route path="/guess" element={<GuessPage />} />
        <Route path="/type-clash" element={<TypeClashPage />} />
        <Route path="/silhouette-blitz" element={<SilhouetteBlitzPage />} />
        <Route path="/dex-rush" element={<DexRushPage />} />
      </Route>
    </Routes>
  );
};
