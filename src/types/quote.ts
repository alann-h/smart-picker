export interface QuoteSummary {
  id: string;
  quoteNumber: string;
  customerName: string;
  totalAmount: number;
  lastModified: string;
}

export interface RunQuote {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  orderStatus: 'pending' | 'checking' | 'finalised' | 'assigned';
  priority: number;
}

export interface Run {
  id: string;
  run_number?: string;
  status: 'pending' | 'checking' | 'finalised' | 'assigned';
  quotes?: RunQuote[];
  created_at?: string;
  updated_at?: string;
}
