import React, { createContext, useContext, useEffect, useState } from "react";
import { CourierProfile, User } from "@/src/types";
import { mockUser } from "@/src/mocks/user";
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from "@/src/utils/storage";
import { api } from "@/src/services/api";

// Resultado das ações de login/cadastro. Quando dá errado, diz em qual campo
// está o problema, para a tela mostrar a mensagem embaixo do campo certo.
export type AuthResult =
  | { ok: true }
  | { ok: false; field: "email" | "password"; message: string };

// Conta salva no aparelho. Como o app ainda não tem um backend de usuários,
// as contas ficam no AsyncStorage. Num app real a senha ficaria no servidor,
// guardada com hash, e nunca no celular.
type StoredAccount = {
  password: string;
  user: User;
};

// Conta de demonstração que já vem pronta para testar o app
export const DEMO_EMAIL = mockUser.email;
export const DEMO_PASSWORD = "123456";

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (userData: Partial<User>, password: string) => Promise<AuthResult>;
  resetPassword: (email: string, newPassword: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function loadAccounts(): Promise<StoredAccount[]> {
  const stored = await storageGet<StoredAccount[] | null>(STORAGE_KEYS.ACCOUNTS, null);
  if (stored) return stored;
  // Primeira vez que o app abre: cria a conta de demonstração
  const initial = [{ password: DEMO_PASSWORD, user: mockUser }];
  await storageSet(STORAGE_KEYS.ACCOUNTS, initial);
  return initial;
}

function findAccount(accounts: StoredAccount[], email: string) {
  return accounts.find((a) => normalizeEmail(a.user.email) === normalizeEmail(email));
}

/**
 * Contexto de autenticação: usuário logado, login, cadastro, redefinir senha,
 * sair e atualizar dados. As contas ficam salvas no aparelho (AsyncStorage).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ao abrir o app, recupera quem estava logado. Se ninguém estava,
    // o usuário fica null e a tela de login é exibida.
    async function loadStorageUser() {
      try {
        await loadAccounts();
        const stored = await storageGet<User | null>(STORAGE_KEYS.AUTH_USER, null);
        if (stored) setUser(stored);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageUser();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const accounts = await loadAccounts();
    const account = findAccount(accounts, email);

    if (!account) {
      return { ok: false, field: "email", message: "Não existe conta com este e-mail." };
    }
    if (account.password !== password) {
      return { ok: false, field: "password", message: "Senha incorreta." };
    }

    setUser(account.user);
    await storageSet(STORAGE_KEYS.AUTH_USER, account.user);
    return { ok: true };
  };

  const signUp = async (userData: Partial<User>, password: string): Promise<AuthResult> => {
    const accounts = await loadAccounts();
    const email = normalizeEmail(userData.email || "");

    if (findAccount(accounts, email)) {
      return { ok: false, field: "email", message: "Este e-mail já está cadastrado." };
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      name: userData.name || "Novo Usuário",
      lastName: userData.lastName || "",
      email,
      phone: userData.phone || "",
      address: userData.address || "Endereço a cadastrar",
      avatar: mockUser.avatar,
      role: userData.role || "customer",
      store: userData.store,
      vehicleType: userData.vehicleType,
      vehiclePlate: userData.vehiclePlate,
      courierMode: userData.courierMode,
      cityId: userData.cityId || "cid-santaines",
      cityName: userData.cityName || "Santa Inês",
      neighborhoodId: userData.neighborhoodId,
      neighborhoodName: userData.neighborhoodName,
      addresses: userData.addresses || [],
      savedPaymentMethods: userData.savedPaymentMethods || [],
      notifications: userData.notifications || {
        orderUpdates: true,
        promotions: true,
        whatsappUpdates: true,
      },
    };

    // Entregador: cria o perfil inicial de motoboy
    if (newUser.role === "courier") {
      const courierProfile: CourierProfile = {
        id: `c-${newUser.id}`,
        userId: newUser.id,
        name: `${newUser.name} ${newUser.lastName || ""}`.trim(),
        phone: newUser.phone || "",
        vehicle:
          userData.vehicleType === "carro"
            ? "Carro"
            : userData.vehicleType === "bicicleta"
            ? "Bicicleta"
            : "Motocicleta",
        vehicleType: userData.vehicleType || "moto",
        plate: userData.vehiclePlate || "",
        mode: userData.courierMode || "independent",
        rating: 5.0,
        isActive: true,
        isOnline: true,
        totalDeliveries: 0,
        totalEarnings: 0,
      };
      newUser.courier = courierProfile;
      await storageSet(STORAGE_KEYS.COURIER_PROFILE, courierProfile);
    }

    // Empreendedor: cria a loja uma única vez, já com o id que fica salvo no usuário
    if (newUser.store) {
      await api.registerPartner({
        id: newUser.store.id,
        storeName: newUser.store.name,
        category: newUser.store.category,
        deliveryTime: newUser.store.deliveryTime,
        deliveryFee: newUser.store.deliveryFee,
        address: newUser.store.address,
        phone: newUser.store.phone,
        ownerName: `${newUser.name} ${newUser.lastName || ""}`.trim(),
        ownerEmail: newUser.email,
        cityId: newUser.store.cityId || "cid-santaines",
        cityName: newUser.store.cityName || "Santa Inês",
        neighborhoodId: newUser.store.neighborhoodId,
        neighborhoodName: newUser.store.neighborhoodName,
        deliveryMode: newUser.store.deliveryMode,
      });
    }

    await storageSet(STORAGE_KEYS.ACCOUNTS, [...accounts, { password, user: newUser }]);
    setUser(newUser);
    await storageSet(STORAGE_KEYS.AUTH_USER, newUser);
    return { ok: true };
  };

  // Redefine a senha direto no aparelho (não há envio de e-mail nesta versão)
  const resetPassword = async (email: string, newPassword: string): Promise<AuthResult> => {
    const accounts = await loadAccounts();
    const account = findAccount(accounts, email);
    if (!account) {
      return { ok: false, field: "email", message: "Não existe conta com este e-mail." };
    }
    account.password = newPassword;
    await storageSet(STORAGE_KEYS.ACCOUNTS, accounts);
    return { ok: true };
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updated: User = { ...user, ...userData };
    setUser(updated);
    await storageSet(STORAGE_KEYS.AUTH_USER, updated);

    // Mantém a conta salva igual ao usuário logado (para não perder as mudanças no próximo login)
    const accounts = await loadAccounts();
    const index = accounts.findIndex((a) => a.user.id === updated.id);
    if (index > -1) {
      accounts[index] = { ...accounts[index], user: updated };
      await storageSet(STORAGE_KEYS.ACCOUNTS, accounts);
    }
  };

  const signOut = async () => {
    setUser(null);
    await storageRemove(STORAGE_KEYS.AUTH_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
