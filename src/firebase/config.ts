// Configuração do Firebase (Authentication + Firestore).
// O app é offline-first: em produção os dados locais sincronizam com o Firestore
// quando há conexão (ETAPA 5). Aqui apenas lemos a configuração do ambiente.
//
// Configure as variáveis copiando o `.env.example` para `.env`.

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  };
}

/** true quando as variáveis de ambiente do Firebase foram preenchidas. */
export function isFirebaseConfigurado(): boolean {
  const c = getFirebaseConfig();
  return Boolean(c.apiKey && c.projectId);
}
