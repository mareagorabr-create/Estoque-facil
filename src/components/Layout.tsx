import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Home, Package, ArrowLeftRight, BarChart3, Settings, WifiOff } from "lucide-react";

import { db, uid } from "../db";
import { processarFilaSync, setupSyncOffline } from "../data";

const abas = [
  { to: "/", label: "Início", Icon: Home, end: true },
  { to: "/produtos", label: "Produtos", Icon: Package, end: false },
  { to: "/movimentar", label: "Movimentar", Icon: ArrowLeftRight, end: false },
  { to: "/relatorios", label: "Relatórios", Icon: BarChart3, end: false },
  { to: "/ajustes", label: "Ajustes", Icon: Settings, end: false },
];

export function Layout() {
  const online = useOnline();

  // Configura listeners de sincronização offline quando o componente monta
  useEffect(() => {
    setupSyncOffline();
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface flex flex-col relative">
      {!online && (
        <div className="sticky top-0 z-20 bg-amber-100 text-amber-800 text-xs font-semibold px-4 py-2 flex items-center gap-2">
          <WifiOff size={14} />
          Modo offline — mudanças ficam salvas no aparelho e sincronizam quando a conexão voltar.
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {abas.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
                isActive ? "text-primary" : "text-slate-400"
              }`
            }
          >
            <Icon size={22} strokeWidth={2.2} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
