import api from './axios';
export interface MOVAttachment { id: string; fileName: string; fileType: string; fileSizeBytes: number; uploadedAt: string }
const path = (id: string) => `/admin/accomplishments/${encodeURIComponent(id)}/mov`;
export async function listMOV(id: string): Promise<MOVAttachment[]> {
  return (await api.get(path(id))).data.data;
}
export async function uploadMOV(id: string, file: File): Promise<MOVAttachment> {
  const body = new FormData();
  body.append('file', file);
  return (await api.post(path(id), body)).data.data;
}
export async function downloadMOV(id: string, attachmentId: string): Promise<string> {
  const data = (await api.get(`${path(id)}/${encodeURIComponent(attachmentId)}/download`)).data.data;
  const url = new URL(data.signedUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid download URL');
  return url.href;
}
