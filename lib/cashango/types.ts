export type CngTransaction = {
  id?: string;
  amount?: number | string;
  total?: number | string;
  fee?: number | string;
  tips?: number | string;
  isDebit?: number;
  transactionType?: string;
  processed?: number | boolean;
  archived?: boolean;
  platformId?: string;
  owner?: string | number;
  ownerName?: string;
  ownerEmail?: string;
  merchantId?: string;
  merchantCode?: string;
  merchantName?: string;
  merchantUser?: string | null;
  newBalance?: number;
  description?: string;
  descriptionForCustomer?: string;
  datetimestamp?: number;
  dateProcessed?: number;
  orderId?: string;
  specialId?: string;
  webOrderNumber?: string;
  webPassphrase?: string | null;
  signature?: string;
  card?: string;
  cardholder?: string;
  cardType?: string;
  authCode?: string;
};

export type CngTransactionDetailResponse = {
  success?: boolean;
  transaction?: CngTransaction;
  message?: string;
};

export type CngPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type CngTransactionsResponse = {
  success?: boolean;
  data?: CngTransaction[];
  pagination?: CngPagination;
  message?: string;
};

export type CngTransactionLookup =
  | { orderNumber: string }
  | { paymentId: string }
  | { passphrase: string };

export type CngApiAuth = {
  merchantId: string;
  apiKey: string;
  baseUrl: string;
};
