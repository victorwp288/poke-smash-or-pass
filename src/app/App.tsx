import { Navigate, Route, Routes } from "react-router-dom";
import { ShellLayout } from "@/app/layout/ShellLayout";
import { SmashPage } from "@/games/smash/SmashPage";

export const App = () => {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route path="/" element={<SmashPage />} />
        <Route path="/smash" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
