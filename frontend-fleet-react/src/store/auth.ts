import { create } from "zustand";

interface AuthState {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem("fleet_token");

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  login: (token) => {
    localStorage.setItem("fleet_token", token);
    set({ token });
  },
  logout: () => {
    localStorage.removeItem("fleet_token");
    set({ token: null });
  },
}));
