import { api } from "@/api/client";
import type { LoginResponse } from "@/types";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/v1/auth/login", { email, password });
  return data;
}
