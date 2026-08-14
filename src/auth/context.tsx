// Autenticação por telefone (código SMS/WhatsApp).
// MVP: código é gerado e exibido na tela (modo mock, sem Twilio real).
// Em produção: Firebase Authentication (phone) ou Twilio/Zenvia + Firestore.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db, uid } from "../db";
import { criarUsuario, garantirDadosDemo } from "../data";
import { soDigitos } from "../lib/format";

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  storeName: string;
}

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  step: "phone" | "code" | "register" | "done";
  pendingPhone: string;
  mockCode: string;
  requestCode: (phone: string) => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
  register: (name: string, storeName: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);
const SESSION_KEY = "ef_session_user_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AuthState["step"]>("phone");
  const [pendingPhone, setPendingPhone] = useState("");
  const [mockCode, setMockCode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
          const u = await db.users.get(saved);
          if (u) {
            setUser({ id: u.id, phone: u.phone, name: u.name, storeName: u.storeName });
            setStep("done");
            await garantirDadosDemo(u.id);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestCode = async (phone: string) => {
    const tel = soDigitos(phone);
    if (tel.length < 10) throw new Error("Número de telefone inválido.");
    // MOCK: geramos o código e mostramos na tela (sem SMS real).
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setMockCode(code);
    setPendingPhone(tel);
    setStep("code");
  };

  const verifyCode = async (code: string) => {
    if (code.trim() !== mockCode) return false;
    const existente = await db.users.where("phone").equals(pendingPhone).first();
    if (existente) {
      setUser({ id: existente.id, phone: existente.phone, name: existente.name, storeName: existente.storeName });
      localStorage.setItem(SESSION_KEY, existente.id);
      setStep("done");
      await garantirDadosDemo(existente.id);
    } else {
      setStep("register");
    }
    return true;
  };

  const register = async (name: string, storeName: string, email?: string) => {
    const id = uid();
    await criarUsuario({ id, phone: pendingPhone, name: name.trim(), storeName: storeName.trim(), email: email?.trim() || undefined });
    setUser({ id, phone: pendingPhone, name: name.trim(), storeName: storeName.trim() });
    localStorage.setItem(SESSION_KEY, id);
    setStep("done");
    await garantirDadosDemo(id);
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setStep("phone");
    setPendingPhone("");
    setMockCode("");
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        step,
        pendingPhone,
        mockCode,
        requestCode,
        verifyCode,
        register,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
