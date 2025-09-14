import { db } from '~/server/db';
import { AccessError } from '~/lib/errors';
import type { ConnectionType } from '~/lib/types';

export interface ApiCallLog {
  userId: string;
  companyId: string;
  apiEndpoint: string;
  connectionType: ConnectionType;
  requestMethod: string;
  responseStatus: number;
  ipAddress: string;
  userAgent: string;
  errorMessage?: string;
  responseTime?: number;
}

export interface ConnectionHealthUpdate {
  companyId: string;
  connectionType: ConnectionType;
  status: 'healthy' | 'unhealthy' | 'expired';
  lastChecked: Date;
  errorMessage?: string;
}

export class AuditService {
  /**
   * Log an API call for audit purposes
   */
  async logApiCall(logData: ApiCallLog): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: logData.userId,
          companyId: logData.companyId,
          apiEndpoint: logData.apiEndpoint,
          connectionType: logData.connectionType,
          requestMethod: logData.requestMethod,
          responseStatus: logData.responseStatus,
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
          errorMessage: logData.errorMessage,
          responseTime: logData.responseTime,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Update connection health status
   */
  async updateConnectionHealth(
    companyId: string,
    connectionType: ConnectionType,
    status: 'healthy' | 'unhealthy' | 'expired',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.connectionHealth.upsert({
        where: {
          companyId_connectionType: {
            companyId,
            connectionType,
          },
        },
        update: {
          status,
          lastChecked: new Date(),
          errorMessage,
        },
        create: {
          companyId,
          connectionType,
          status,
          lastChecked: new Date(),
          errorMessage,
        },
      });
    } catch (error) {
      console.error('Failed to update connection health:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get connection health for a company
   */
  async getConnectionHealth(companyId: string): Promise<ConnectionHealthUpdate[]> {
    try {
      const healthRecords = await db.connectionHealth.findMany({
        where: { companyId },
        orderBy: { lastChecked: 'desc' },
      });

      return healthRecords.map(record => ({
        companyId: record.companyId,
        connectionType: record.connectionType as ConnectionType,
        status: record.status as 'healthy' | 'unhealthy' | 'expired',
        lastChecked: record.lastChecked,
        errorMessage: record.errorMessage,
      }));
    } catch (error) {
      console.error('Failed to get connection health:', error);
      throw new AccessError('Failed to retrieve connection health');
    }
  }

  /**
   * Get recent API calls for a company
   */
  async getRecentApiCalls(companyId: string, limit: number = 50): Promise<ApiCallLog[]> {
    try {
      const logs = await db.auditLog.findMany({
        where: { companyId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return logs.map(log => ({
        userId: log.userId,
        companyId: log.companyId,
        apiEndpoint: log.apiEndpoint,
        connectionType: log.connectionType as ConnectionType,
        requestMethod: log.requestMethod,
        responseStatus: log.responseStatus,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        errorMessage: log.errorMessage,
        responseTime: log.responseTime,
      }));
    } catch (error) {
      console.error('Failed to get recent API calls:', error);
      throw new AccessError('Failed to retrieve API call logs');
    }
  }
}

export const auditService = new AuditService();
