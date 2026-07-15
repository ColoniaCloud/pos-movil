import { clearSession, getToken, setSession } from "./token-store";
import type {
  AssistantApiResponse,
  AssistantChatMessage,
  Client,
  PaymentMethod,
  Product,
  SaleDetail,
  SaleListItem,
  SessionUser,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    throw new ApiError("Sesión vencida, iniciá sesión de nuevo", 401);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? "Ocurrió un error inesperado", res.status);
  }
  return body as T;
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const data = await request<{ token: string; user: SessionUser }>(
    "/api/mobile/v1/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) }
  );
  setSession(data.token, data.user);
  return data.user;
}

export async function searchClients(search: string): Promise<Client[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await request<{ clients: Client[] }>(`/api/mobile/v1/clients${qs}`);
  return data.clients;
}

export async function createClient(input: {
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  email?: string;
  cuit?: string;
}): Promise<Client> {
  const data = await request<{ client: Client }>("/api/mobile/v1/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.client;
}

export async function searchProducts(search: string): Promise<Product[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await request<{ products: Product[] }>(`/api/mobile/v1/products${qs}`);
  return data.products;
}

export async function findProductBySku(sku: string): Promise<Product | null> {
  const data = await request<{ products: Product[] }>(
    `/api/mobile/v1/products?sku=${encodeURIComponent(sku)}`
  );
  return data.products[0] ?? null;
}

export async function listSales(contactId?: string): Promise<SaleListItem[]> {
  const qs = contactId ? `?contactId=${encodeURIComponent(contactId)}` : "";
  const data = await request<{ sales: SaleListItem[] }>(`/api/mobile/v1/sales${qs}`);
  return data.sales;
}

export async function getSale(id: string): Promise<SaleDetail> {
  const data = await request<{ sale: SaleDetail }>(`/api/mobile/v1/sales/${id}`);
  return data.sale;
}

export async function addSaleNote(id: string, note: string): Promise<void> {
  await request(`/api/mobile/v1/sales/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export async function createSale(input: {
  contactId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  discount?: number;
  notes?: string;
  requiresFactura: boolean;
  taxId?: string;
}): Promise<SaleDetail> {
  const data = await request<{ sale: SaleDetail }>("/api/mobile/v1/sales", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.sale;
}

export async function listPendingPayments(): Promise<SaleListItem[]> {
  const data = await request<{ sales: SaleListItem[] }>("/api/mobile/v1/payments");
  return data.sales;
}

export async function createPayment(input: {
  saleId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}): Promise<void> {
  await request("/api/mobile/v1/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendRemitoEmail(saleId: string, email?: string): Promise<{ sentTo: string }> {
  return request(`/api/mobile/v1/remitos/${saleId}/send`, {
    method: "POST",
    body: JSON.stringify(email ? { email } : {}),
  });
}

export async function askAssistant(
  message: string,
  history: AssistantChatMessage[]
): Promise<AssistantApiResponse> {
  return request<AssistantApiResponse>("/api/mobile/v1/assistant", {
    method: "POST",
    body: JSON.stringify({
      message,
      // The backend only needs role+content, same shape the CRM's own
      // assistant frontend sends (last 10 turns is plenty of context).
      history: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    }),
  });
}
