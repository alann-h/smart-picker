import { db } from '~/server/db';
import { AccessError } from '~/lib/errors';
import type { Customer, LocalCustomer, QBOCustomer } from '~/types/customer';
import type { ConnectionType } from '~/lib/types';

import { tokenService } from './token';

const authSystem = {
  getXeroTenantId: async (_oauthClient: unknown) => {
    // TODO: Implement based on your existing auth system
    throw new Error('Auth system not implemented');
  }
};

const getBaseURL = async (_oauthClient: unknown, _connectionType: ConnectionType): Promise<string> => {
  // TODO: Implement based on your existing auth service
  throw new Error('Base URL service not implemented');
};

const getRealmId = (_oauthClient: unknown): string => {
  // TODO: Implement based on your existing auth service
  throw new Error('Realm ID service not implemented');
};

export async function fetchCustomersLocal(companyId: string): Promise<LocalCustomer[]> {
  try {
    // Fetch from your database using Prisma
    const customers = await db.customer.findMany({
      where: { companyId },
      select: {
        id: true,
        customerName: true
      },
      orderBy: { customerName: 'asc' }
    });
    
    return customers.map(customer => ({
      id: customer.id,
      customer_name: customer.customerName
    }));
  } catch (error: unknown) {
    console.error('Error fetching customers from database:', error);
    if (error instanceof Error) {
      throw new AccessError('Failed to fetch customers: ' + error.message);
    }
    throw new AccessError('An unknown error occurred while fetching customers.');
  }
}

export async function fetchCustomers(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<Omit<Customer, 'company_id'>[]> {
  try {
    if (connectionType === 'qbo') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'qbo');
      return await fetchQBOCustomers(oauthClient);
    } else if (connectionType === 'xero') {
      const oauthClient = await tokenService.getOAuthClient(companyId, 'xero');
      return await fetchXeroCustomers(oauthClient);
    } else {
      const errorMessage = `Unsupported connection type: ${String(connectionType)}`;
      throw new AccessError(errorMessage);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new AccessError('Failed to fetch customers: ' + e.message);
    }
    throw new AccessError('An unknown error occurred while fetching customers.');
  }
}

async function fetchQBOCustomers(oauthClient: unknown): Promise<Omit<Customer, 'company_id'>[]> {
  const baseURL = await getBaseURL(oauthClient, 'qbo');
  const realmId = getRealmId(oauthClient);

  const allCustomers: Omit<Customer, 'company_id'>[] = [];
  let startPosition = 1;
  const pageSize = 100; // API limit
  let moreRecords = true;

  while (moreRecords) {
    // Type assertion for mock implementation
    const client = oauthClient as { makeApiCall: (options: { url: string }) => Promise<{ json: unknown }> };
    const response = await client.makeApiCall({
      url: `${baseURL}v3/company/${realmId}/query?query=select * from Customer startPosition ${startPosition} maxResults ${pageSize}&minorversion=75`
    });
    const responseData = response.json as { QueryResponse: { Customer?: QBOCustomer[] } };
    const customers: QBOCustomer[] = responseData.QueryResponse.Customer ?? [];

    allCustomers.push(...customers.map((customer: QBOCustomer) => ({
      id: customer.Id,
      customer_name: customer.DisplayName
    })));

    if (customers.length < pageSize) {
      moreRecords = false;
    } else {
      startPosition += pageSize;
    }
  }
  return allCustomers;
}

async function fetchXeroCustomers(oauthClient: unknown): Promise<Omit<Customer, 'company_id'>[]> {
  try {
    const tenantId = await authSystem.getXeroTenantId(oauthClient);

    if (!tenantId) {
        throw new Error('Xero tenant ID not found.');
    }

    const allCustomers: Omit<Customer, 'company_id'>[] = [];
    let page = 1;
    let hasMorePages = true;

    const whereFilter = 'IsCustomer==true';

    while (hasMorePages) {
      // Type assertion for mock implementation
      const client = oauthClient as { 
        accountingApi: { 
          getContacts: (
            tenantId: string,
            ifModifiedSince?: unknown,
            where?: string,
            order?: unknown,
            iDs?: unknown,
            page?: number,
            includeArchived?: boolean,
            summaryOnly?: boolean,
            searchTerm?: unknown
          ) => Promise<{ body: { contacts?: Array<{ contactID?: string; name?: string }> } }>
        }
      };
      
      const response = await client.accountingApi.getContacts(
        tenantId,
        undefined,  // ifModifiedSince
        whereFilter, // where
        undefined,  // order
        undefined,  // iDs
        page,       // page
        true,       // includeArchived
        true,       // summaryOnly
        undefined  // searchTerm
      );

      const customers = response.body.contacts ?? [];
      
      allCustomers.push(...customers.map((customer) => ({
        id: customer.contactID ?? '',
        customer_name: customer.name ?? ''
      })));

      // Check if there are more pages
      if (customers.length < 100) {
        hasMorePages = false;
      } else {
        page++;
      }
    }

    return allCustomers;
  } catch (error: unknown) {
    console.error('Error fetching Xero customers:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch Xero customers: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching Xero customers.');
  }
}

export async function saveCustomers(customers: Omit<Customer, 'company_id'>[], companyId: string): Promise<void> {
  try {
    // Use Prisma transaction for better type safety
    await db.$transaction(async (tx) => {
      for (const customer of customers) {
        if (customer.id == null) {
          console.error('❌ Null or undefined customerId found:', customer);
          continue;
        }
        
        await tx.customer.upsert({
          where: { id: customer.id },
          update: { 
            customerName: customer.customer_name 
          },
          create: {
            id: customer.id,
            customerName: customer.customer_name,
            companyId: companyId
          }
        });
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AccessError(error.message);
    }
    throw new AccessError('An unknown error occurred while saving customers.');
  }
}
