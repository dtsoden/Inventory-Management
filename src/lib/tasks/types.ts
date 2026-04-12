export type ActionItemType =
  | 'PO_PENDING_APPROVAL'
  | 'PO_AWAITING_APPROVAL'
  | 'RECEIVING_IN_PROGRESS'
  | 'LOW_STOCK';

export interface ActionItem {
  id: string;
  type: ActionItemType;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  href: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
