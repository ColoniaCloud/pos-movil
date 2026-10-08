import { clearSession, getToken, setSession } from "./token-store";
import type {
  AssistantApiResponse,
  AssistantChatMessage,
  Client,
  LeadActivityItem,
  LeadDetail,
  LeadListItem,
  PaymentMethod,
  Product,
  RefundMethod,
  SaleDetail,
  SaleListItem,
  SaleReturnsInfo,
  SessionUser,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  status: number;
  /** Cuerpo crudo de la respuesta: algunos endpoints mandan datos junto al error
   *  —el alta de cliente devuelve los posibles duplicados en un 409—. */
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
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
    throw new ApiError(body.error ?? "Ocurrió un error inesperado", res.status, body);
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
  /** El vendedor ya vio los duplicados que le ofrecimos y decidió crear igual. */
  force?: boolean;
}): Promise<Client> {
  const data = await request<{ client: Client }>("/api/mobile/v1/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.client;
}

export async function createLead(input: {
  firstName: string;
  lastName: string;
  company?: string;
  sector?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  cuit?: string;
  notes?: string;
  // Diagnóstico comercial — el CRM lo guarda como una nota en la ficha del lead.
  monthlyCarVolume?: string;
  filmBrandsUsed?: string;
  currentSuppliers?: string;
  rollPurchasePrices?: string;
  improvementNeeds?: string;
  logisticsIssues?: string;
  /** El vendedor ya vio los duplicados que le ofrecimos y decidió crear igual. */
  force?: boolean;
}): Promise<Client> {
  const data = await request<{ lead: Client }>("/api/mobile/v1/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.lead;
}

/**
 * `contactId` es el cliente de la venta en curso, y **conviene mandarlo siempre
 * que se lo tenga**: con él cada producto vuelve con la etiqueta de descuento que
 * le corresponde a ese cliente (`product.discountTag`), que es lo que el carrito
 * necesita para cantar el total correcto. Sin él, el catálogo viene a precio de
 * lista y sin etiquetas.
 */
export async function searchProducts(search: string, contactId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (contactId) params.set("contactId", contactId);
  const qs = params.toString() ? `?${params}` : "";
  const data = await request<{ products: Product[] }>(`/api/mobile/v1/products${qs}`);
  return data.products;
}

export async function findProductBySku(sku: string, contactId?: string): Promise<Product | null> {
  const params = new URLSearchParams({ sku });
  if (contactId) params.set("contactId", contactId);
  const data = await request<{ products: Product[] }>(`/api/mobile/v1/products?${params}`);
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

export async function getSaleReturns(saleId: string): Promise<SaleReturnsInfo> {
  return request<SaleReturnsInfo>(`/api/mobile/v1/sales/${saleId}/returns`);
}

/**
 * Registra la devolución. Solo ADMIN: el CRM responde 403 a un OPERATOR, y la
 * pantalla ya no le muestra el botón — pero el permiso lo decide el backend.
 */
export async function createSaleReturn(
  saleId: string,
  input: {
    refund: RefundMethod;
    reason?: string;
    items: { saleItemId: string; quantity: number }[];
  }
): Promise<{ number: number; total: number; retainedRolls: string[] }> {
  return request(`/api/mobile/v1/sales/${saleId}/returns`, {
    method: "POST",
    body: JSON.stringify(input),
  });
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

/**
 * El cliente firma el remito en el teléfono del vendedor. Firmar es entregar:
 * la venta pasa a entregada en el CRM. La copia firmada va al email del
 * cliente, o al que se escriba si no tenía uno (`saveEmail` lo guarda en la
 * ficha).
 *
 * Sin señal, `fetch` tira un TypeError y no un ApiError: quien llama lo usa
 * para distinguir "no se guardó por la conexión" de "el CRM lo rechazó".
 */
export async function signRemito(
  saleId: string,
  input: { signature: string; name: string; dni?: string; email?: string; saveEmail?: boolean }
): Promise<{ sentTo: string | null; emailSaved: boolean }> {
  return request(`/api/mobile/v1/remitos/${saleId}/sign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** El link para que el cliente firme desde su celular, con el WhatsApp ya armado. */
export async function getRemitoLink(
  saleId: string
): Promise<{ url: string; whatsappUrl: string | null; message: string; signed: boolean }> {
  return request(`/api/mobile/v1/remitos/${saleId}/link`, { method: "POST" });
}

export async function listLeads(params: {
  search?: string;
  contacted?: boolean;
  myLeads?: boolean;
  hasAddress?: boolean;
}): Promise<LeadListItem[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.contacted !== undefined) qs.set("contacted", String(params.contacted));
  if (params.myLeads) qs.set("myLeads", "1");
  if (params.hasAddress) qs.set("hasAddress", "1");
  const query = qs.toString();
  const data = await request<{ leads: LeadListItem[] }>(
    `/api/mobile/v1/leads${query ? `?${query}` : ""}`
  );
  return data.leads;
}

export async function getLead(id: string): Promise<LeadDetail> {
  const data = await request<{ lead: LeadDetail }>(`/api/mobile/v1/leads/${id}`);
  return data.lead;
}

export async function listLeadActivities(id: string): Promise<LeadActivityItem[]> {
  const data = await request<{ activities: LeadActivityItem[] }>(
    `/api/mobile/v1/leads/${id}/activities`
  );
  return data.activities;
}

export async function addLeadNote(id: string, note: string): Promise<LeadActivityItem> {
  const data = await request<{ activity: LeadActivityItem }>(`/api/mobile/v1/leads/${id}/activities`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
  return data.activity;
}

export async function convertLeadToClient(id: string): Promise<LeadDetail> {
  const data = await request<{ lead: LeadDetail }>(`/api/mobile/v1/leads/${id}/convert`, {
    method: "POST",
  });
  return data.lead;
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
