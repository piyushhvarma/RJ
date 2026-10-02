import { apiFetch, API_BASE_URL } from './client';

export type DocumentType =
  | 'PLEDGE_AGREEMENT'
  | 'APPRAISAL_SHEET'
  | 'PAYMENT_RECEIPT'
  | 'RENEWAL'
  | 'CLOSURE'
  | 'GOLD_RELEASE_RECEIPT'
  | 'CUSTOMER_STATEMENT'
  | 'NOTICE';

export type DocumentStatus =
  | 'GENERATED'
  | 'PRINTED'
  | 'SIGNED_PHYSICALLY'
  | 'PACKET_CREATED'
  | 'STORED'
  | 'SUPERSEDED';

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileUrl: string;
  reason?: string | null;
  createdById: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  documentCode: string;
  loanId: string;
  type: DocumentType;
  status: DocumentStatus;
  currentVersion: number;
  verificationCode: string;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
}

export async function getLoanDocuments(loanId: string): Promise<DocumentRecord[]> {
  return apiFetch<DocumentRecord[]>(`/documents/loan/${loanId}`);
}

export async function markDocumentPrinted(documentId: string): Promise<DocumentRecord> {
  return apiFetch<DocumentRecord>(`/documents/${documentId}/print`, { method: 'POST' });
}

export async function markDocumentSigned(documentId: string): Promise<DocumentRecord> {
  return apiFetch<DocumentRecord>(`/documents/${documentId}/sign`, { method: 'POST' });
}

import { getSession } from '../auth/session';

function withAuthToken(url: string): string {
  const token = getSession()?.accessToken;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function getPledgeAgreementPdfUrl(loanId: string): string {
  return withAuthToken(`${API_BASE_URL}/documents/pledge-agreement/${loanId}/pdf`);
}

export function getJewelleryAnnexurePdfUrl(loanId: string): string {
  return withAuthToken(`${API_BASE_URL}/documents/jewellery-annexure/${loanId}/pdf`);
}

export function getPaymentReceiptPdfUrl(paymentId: string): string {
  return withAuthToken(`${API_BASE_URL}/documents/payment-receipt/${paymentId}/pdf`);
}

export function getClosureReceiptPdfUrl(loanId: string): string {
  return withAuthToken(`${API_BASE_URL}/documents/closure-receipt/${loanId}/pdf`);
}

export function getRenewalReceiptPdfUrl(loanId: string): string {
  return withAuthToken(`${API_BASE_URL}/documents/renewal-receipt/${loanId}/pdf`);
}

/**
 * Fetches PDF using Authorization header and opens it as a secure Blob URL
 */
export async function openSecurePdf(url: string): Promise<void> {
  const session = getSession();
  const res = await fetch(url, {
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Failed to download secure PDF: HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}
