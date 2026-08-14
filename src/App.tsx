import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/context";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ProdutosPage } from "./pages/ProdutosPage";
import { MovimentarPage } from "./pages/MovimentarPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { AjustesPage } from "./pages/AjustesPage";
import { ProdutoFormPage } from "./pages/ProdutoFormPage";

const ONBOARD_KEY = "ef_onboarded_v1";

function ProtectedApp() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem(ONBOARD_KEY) === "1"
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!onboarded) {
    return (
      <OnboardingPage
        onDone={() => {
          localStorage.setItem(ONBOARD_KEY, "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produtos" element={<ProdutosPage />} />
        <Route path="/novo-produto" element={<ProdutoFormPage />} />
        <Route path="/movimentar" element={<MovimentarPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedApp />
      </BrowserRouter>
    </AuthProvider>
  );
}
