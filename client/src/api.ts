const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
  department: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  itPriority: "UNASSIGNED" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: "NEW" | "OPEN" | "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  relatedSystem?: RelatedSystem;
}

export interface Attachment {
  id: number;
  filename: string;
  mimeType: string;
  fileSize: number;
  isRemoved: boolean;
  removedAt?: string | null;
  removalReason?: string | null;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  requester: DevelopmentRequester;
  attachments: Attachment[];
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  summary: string;
  description: string;
}

export interface PaginatedTicketsResponse {
  items: Ticket[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface FetchTicketsParams {
  search?: string;
  categoryId?: string;
  requestedPriority?: string;
  currentStatus?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  try {
    const healthRes = await fetch(`${API_URL}/api/health`);
    if (!healthRes.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }

    const catRes = await fetch(`${API_URL}/api/categories`);
    if (!catRes.ok) {
      throw new Error("Unable to connect to TokTickIT API");
    }

    const categories = await catRes.json();
    return { online: true, categories };
  } catch (error) {
    throw new Error("Unable to connect to TokTickIT API");
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}

export async function fetchRequesters(): Promise<DevelopmentRequester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Failed to fetch development requesters");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch related systems");
  }
  return res.json();
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId: number
): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Development-Requester-Id": String(requesterId),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorObj = new Error(data.message || "Failed to create ticket");
    (errorObj as any).details = data.details;
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  return data;
}

export async function fetchTickets(
  params: FetchTicketsParams,
  requesterId: number
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search) query.append("search", params.search);
  if (params.categoryId) query.append("categoryId", params.categoryId);
  if (params.requestedPriority) query.append("requestedPriority", params.requestedPriority);
  if (params.currentStatus) query.append("currentStatus", params.currentStatus);
  if (params.sortBy) query.append("sortBy", params.sortBy);
  if (params.sortOrder) query.append("sortOrder", params.sortOrder);
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    method: "GET",
    headers: {
      "X-Development-Requester-Id": String(requesterId),
    },
  });

  if (!res.ok) {
    const data = await res.json();
    const errorObj = new Error(data.message || "Failed to fetch tickets");
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  return res.json();
}

export async function fetchTicketDetail(
  ticketId: number,
  requesterId: number
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    method: "GET",
    headers: {
      "X-Development-Requester-Id": String(requesterId),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const errorObj = new Error(data.message || "Failed to fetch ticket detail");
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  return data;
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "X-Development-Requester-Id": String(requesterId),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const errorObj = new Error(data.message || "Failed to upload attachment");
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  return data;
}

export async function downloadAttachment(
  attachmentId: number,
  filename: string,
  requesterId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    method: "GET",
    headers: {
      "X-Development-Requester-Id": String(requesterId),
    },
  });

  if (!res.ok) {
    let errorMsg = "Failed to download attachment";
    try {
      const data = await res.json();
      errorMsg = data.message || errorMsg;
    } catch {}
    const errorObj = new Error(errorMsg);
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId: number
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/soft-remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Development-Requester-Id": String(requesterId),
    },
    body: JSON.stringify({ removalReason }),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorObj = new Error(data.message || "Failed to remove attachment");
    (errorObj as any).status = res.status;
    throw errorObj;
  }

  return data;
}
