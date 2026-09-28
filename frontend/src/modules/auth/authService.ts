import axios from 'axios';
import { apiUrl } from '../../api/apiUrl';
import { AppRole, UserProfile } from '../../types';

export class SessionError extends Error {
  constructor(public kind: 'expired' | 'forbidden' | 'unavailable', message: string) { super(message); }
}

export const authService = {
  /**
   * Log in user via TAGAD canonical backend API
   */
  async login(email: string, password: string): Promise<{ user: UserProfile; token: string; roles: AppRole[] }> {
    try {
      const response = await axios.post(apiUrl('/auth/login'), {
        email: email.trim().toLowerCase(),
        password,
      });

      const resData = response.data?.data || response.data;
      const apiUser = resData.user;
      const token = resData.token || resData.accessToken;
      const refreshToken = resData.refreshToken;

      if (typeof token !== 'string' || !apiUser?.id || !['SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER'].includes(apiUser.role)) {
        throw new Error('Authentication response was invalid');
      }

      this.clearStorage();
      // Store tokens
      localStorage.setItem('tagad_token', token);
      if (refreshToken) {
        localStorage.setItem('tagad_refresh_token', refreshToken);
      }

      // Map roles for application RBAC
      const roles: AppRole[] = [];
      if (apiUser.role === 'SUPER_ADMIN') {
        roles.push('SUPER_ADMIN');
      } else if (apiUser.role === 'ADMIN') {
        roles.push('ADMIN');
      } else if (apiUser.role === 'ENCODER') {
        roles.push('ENCODER');
      } else if (apiUser.role === 'VIEWER') {
        roles.push('VIEWER');
      } else {
        roles.push(apiUser.role as AppRole);
      }

      const userProfile: UserProfile = {
        id: String(apiUser.id),
        email: apiUser.email,
        full_name: apiUser.fullName || apiUser.name || 'System Official',
        office_id: apiUser.officeId || null,
        barangay_id: apiUser.barangayId || null,
        is_active: apiUser.isActive ?? true,
        avatar_url: null,
        created_at: apiUser.createdAt || new Date().toISOString(),
        updated_at: apiUser.updatedAt || new Date().toISOString(),
        roles,
        office: apiUser.officeDetails || (apiUser.office ? { id: apiUser.officeId || '', code: apiUser.office, name: apiUser.office, head_name: null, is_active: true, created_at: '', updated_at: '' } : null),
        barangay: apiUser.barangayDetails || null,
      };

      localStorage.setItem('tagad_user', JSON.stringify(userProfile));
      localStorage.setItem('tagad_roles', JSON.stringify(roles));

      return {
        user: userProfile,
        token,
        roles,
      };
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Authentication failed.';
      throw new Error(err.response ? errorMessage : err.message === 'Authentication response was invalid' ? err.message : 'The backend is unreachable or unavailable. Please retry.');
    }
  },

  /**
   * Log out user via TAGAD backend API and clear local session
   * Distinguishes between local sign-out and confirmed server revocation
   */
  async logout(): Promise<{ success: boolean; serverConfirmed: boolean; error?: string }> {
    const token = localStorage.getItem('tagad_token');
    try {
      if (!token) return { success: true, serverConfirmed: false };
      await axios.post(apiUrl('/auth/logout'), {}, { headers: { Authorization: `Bearer ${token}` } });
      return { success: true, serverConfirmed: true };
    } catch {
      return { success: true, serverConfirmed: false, error: 'Local authentication cleared. Server logout could not be confirmed.' };
    } finally {
      this.clearStorage();
    }
  },

  /**
   * Get current session and profile using /api/auth/me
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    const storedToken = localStorage.getItem('tagad_token');
    if (!storedToken) {
      return null;
    }

    try {
      // Restore user from /api/auth/me
      const currentToken = localStorage.getItem('tagad_token') || storedToken;
      let response;
      try {
        response = await axios.get(apiUrl('/auth/me'), { headers: { Authorization: `Bearer ${currentToken}` } });
      } catch (error: any) {
        const refreshToken = localStorage.getItem('tagad_refresh_token');
        if (error.response?.status !== 401 || !refreshToken) throw error;
        // A rejected access token can never authorize the cached profile.
        localStorage.removeItem('tagad_user');
        localStorage.removeItem('tagad_roles');
        const refreshed = await axios.post(apiUrl('/auth/refresh'), { refreshToken });
        const data = refreshed.data?.data ?? refreshed.data;
        if (typeof data?.accessToken !== 'string' || !data.accessToken) {
          this.clearStorage();
          throw { response: { status: 401 } };
        }
        localStorage.setItem('tagad_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('tagad_refresh_token', data.refreshToken);
        response = await axios.get(apiUrl('/auth/me'), { headers: { Authorization: `Bearer ${data.accessToken}` } });
      }

      const resData = response.data?.data || response.data;
      const apiUser = resData;
      if (!apiUser?.id || !['SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER'].includes(apiUser.role)) {
        throw new SessionError('unavailable', 'Invalid session response');
      }

      const roles: AppRole[] = [];
      if (apiUser.role === 'SUPER_ADMIN') {
        roles.push('SUPER_ADMIN');
      } else if (apiUser.role === 'ADMIN') {
        roles.push('ADMIN');
      } else if (apiUser.role === 'ENCODER') {
        roles.push('ENCODER');
      } else if (apiUser.role === 'VIEWER') {
        roles.push('VIEWER');
      } else {
        roles.push(apiUser.role as AppRole);
      }

      const userProfile: UserProfile = {
        id: String(apiUser.id),
        email: apiUser.email,
        full_name: apiUser.fullName || apiUser.name || 'System Official',
        office_id: apiUser.officeId || null,
        barangay_id: apiUser.barangayId || null,
        is_active: apiUser.isActive ?? true,
        avatar_url: null,
        created_at: apiUser.createdAt || new Date().toISOString(),
        updated_at: apiUser.updatedAt || new Date().toISOString(),
        roles,
        office: apiUser.officeDetails || (apiUser.office ? { id: apiUser.officeId || '', code: apiUser.office, name: apiUser.office, head_name: null, is_active: true, created_at: '', updated_at: '' } : null),
        barangay: apiUser.barangayDetails || null,
      };

      localStorage.setItem('tagad_user', JSON.stringify(userProfile));
      localStorage.setItem('tagad_roles', JSON.stringify(roles));

      return userProfile;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        this.clearStorage();
        throw new SessionError(status === 401 ? 'expired' : 'forbidden',
          status === 401 ? 'Your session has expired. Sign in again.' : 'Access to this account is forbidden.');
      }
      throw new SessionError('unavailable', 'The backend is unreachable or unavailable. Retry to verify your session.');
    }
  },

  clearStorage(): void {
    localStorage.removeItem('tagad_token');
    localStorage.removeItem('tagad_refresh_token');
    localStorage.removeItem('tagad_user');
    localStorage.removeItem('tagad_roles');
  },
};
