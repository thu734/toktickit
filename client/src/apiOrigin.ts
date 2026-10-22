export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const attachmentDownloadUrl = (id: number) => `${API_URL.replace(/\/$/, '')}/api/attachments/${id}/download`;
