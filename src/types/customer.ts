export interface Customer {
  id: string;
  customer_name: string;
  company_id?: string;
}

export interface LocalCustomer {
  id: string;
  customer_name: string;
}

export interface QBOCustomer {
  Id: string;
  DisplayName: string;
}

export interface XeroContact {
  contactID?: string;
  name?: string;
}
