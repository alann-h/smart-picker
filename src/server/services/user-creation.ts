import { permissionService } from './permission';

/**
 * Helper function to set default permissions for a new user
 * This ensures consistent permission handling across all user creation flows
 */
export async function setUserPermissions(
  userId: string, 
  companyId: string, 
  isAdmin: boolean,
  context: string = 'unknown'
): Promise<void> {
  if (!companyId) {
    console.warn(`[${context}] Cannot set permissions: companyId is missing`);
    return;
  }

  try {
    await permissionService.setDefaultPermissions(userId, companyId, isAdmin);
    console.log(`[${context}] Successfully set default permissions for user ${userId} in company ${companyId} (admin: ${isAdmin})`);
  } catch (permissionError) {
    console.error(`[${context}] Failed to set default permissions for user ${userId}:`, permissionError);
    // Don't throw the error - user creation should still succeed even if permission setting fails
    // The permission system will fall back to checking the user's isAdmin flag
  }
}
