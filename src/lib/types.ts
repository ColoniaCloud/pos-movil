export type AppRole = "SUPERADMIN" | "ADMIN" | "OPERATOR";

/** Espeja el enum SaleStatus del CRM (prisma/schema.prisma). */
export type SaleStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

/**
 * Espeja ContactType del CRM. Lead, Cliente e Instalador son la misma tabla,
 * discriminada por este campo: por eso el POS puede venderle a un instalador
 * sin que sea un modelo aparte.
 */
export type ContactType = "LEAD" | "CLIENT" | "INSTALLER";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  avatarUrl: string | null;
};

/**
 * Etiqueta de descuento del contacto: el descuento pactado que el CRM le aplica
 * solo a la venta, sobre el precio de lista. Viene ya filtrada — el CRM manda
 * `null` si la etiqueta esta desactivada, asi el POS no tiene que saber la regla.
 */
export type DiscountTag = {
  id: string;
  code: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  /** En PERCENTAGE es el porcentaje (20 = 20%); en FIXED, pesos. */
  value: number;
  active: boolean;
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  cuit: string | null;
  type: ContactType;
  discountTag?: DiscountTag | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type SaleListItem = {
  id: string;
  number: number;
  contactName: string;
  total: number;
  totalPaid: number;
  remaining: number;
  status: SaleStatus;
  itemsCount?: number;
  createdAt: string;
};

export type SaleDetail = {
  id: string;
  number: number;
  contact: Omit<Client, "type"> & { type?: ContactType };
  status: SaleStatus;
  requiresFactura: boolean;
  notes: string | null;
  subtotal: number;
  discount: number;
  /** La parte de `discount` que puso la etiqueta del cliente. */
  tagDiscount: number;
  /** La parte que cargo a mano el vendedor. */
  manualDiscount: number;
  /** `"A — Mayorista (20%)"`, o null si no se aplico ninguna etiqueta. */
  discountTagLabel: string | null;
  tax: number;
  total: number;
  totalPaid: number;
  remaining: number;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  payments: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    paidAt: string;
  }[];
};

export type PaymentMethod = "CASH" | "TRANSFER" | "CHECK" | "CARD" | "OTHER";

export type LeadListItem = {
  id: string;
  leadNumber: number;
  firstName: string;
  lastName: string;
  company: string | null;
  sector: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  city: string | null;
  contacted: boolean;
  createdAt: string;
};

export type LeadDetail = {
  id: string;
  leadNumber: number;
  firstName: string;
  lastName: string;
  company: string | null;
  sector: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  cuit: string | null;
  notes: string | null;
  contacted: boolean;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
};

export type LeadActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
};

export type AssistantNavigateAction = { type: "navigate"; path: string; label: string };

export type AssistantTableAction = {
  type: "table";
  title: string;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
};

export type AssistantCampaignAction = {
  type: "campaign";
  label: string;
  contactType: "LEAD" | "CLIENT" | "INSTALLER";
  message: string;
  delaySeconds: number;
  recipientCount: number;
};

export type AssistantFileAction = {
  type: "file";
  filename: string;
  mimeType: string;
  contentBase64: string;
  label: string;
};

export type AssistantAction =
  | AssistantNavigateAction
  | AssistantTableAction
  | AssistantCampaignAction
  | AssistantFileAction;

export type AssistantApiResponse = {
  message: string;
  action?: AssistantAction;
  error?: string;
};

export type AssistantChatMessage = { role: "user" | "assistant"; content: string; action?: AssistantAction };

/** Espeja SaleReturnRefund del CRM. */
export type RefundMethod = "CREDIT_NOTE" | "CASH";

/** Una línea de la venta, con lo que ya se devolvió descontado. */
export type ReturnableItem = {
  saleItemId: string;
  productId: string;
  productName: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  returned: number;
  returnable: number;
};

export type SaleReturn = {
  id: string;
  number: number;
  refund: RefundMethod;
  total: number;
  reason: string | null;
  /** Rollos que no volvieron a stock porque la garantía ya estaba activada. */
  retainedRolls: string | null;
  createdAt: string;
  userName: string;
  items: {
    id: string;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
};

export type SaleReturnsInfo = {
  saleNumber: number;
  /** Solo las ventas confirmadas o entregadas admiten devolución. */
  returnable: boolean;
  /**
   * Cuánto se acredita por cada peso de mercadería devuelta. Con factura es
   * mayor a 1 (arrastra el IVA) y con descuento, menor. Viene del CRM: la app
   * NO lo recalcula, para que el número que ve el vendedor sea el que se emite.
   */
  creditRatio: number;
  items: ReturnableItem[];
  returns: SaleReturn[];
};
