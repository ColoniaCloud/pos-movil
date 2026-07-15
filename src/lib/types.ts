export type AppRole = "SUPERADMIN" | "ADMIN" | "OPERATOR";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  avatarUrl: string | null;
};

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  cuit: string | null;
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
  itemsCount?: number;
  createdAt: string;
};

export type SaleDetail = {
  id: string;
  number: number;
  contact: Client & { type?: string };
  requiresFactura: boolean;
  notes: string | null;
  subtotal: number;
  discount: number;
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
