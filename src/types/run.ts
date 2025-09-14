export type RunStatus = 'pending' | 'checking' | 'finalised';
export type OrderStatus = 'pending' | 'checking' | 'finalised' | 'assigned';

export interface Run {
  id: string;
  company_id: string;
  created_at: Date;
  run_number: number;
  status: RunStatus;
}

export interface RunWithDetails extends Run {
  quotes: QuoteInRun[];
}

export interface QuoteInRun {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  totalAmount: number;
  priority: number;
  orderStatus: OrderStatus;
}

export interface RunItemFromDB {
  id: string;
  runId: string;
  quoteId: string;
  priority: number;
}

export interface RunQuote {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  orderStatus: OrderStatus;
  priority: number;
}
