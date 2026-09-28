import axios from 'axios';
import { apiUrl } from '../../api/apiUrl';
import { AppRole, UserProfile } from '../../types';

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

      if (!token || !apiUser) {
        throw new Error('Authentication response was invalid');
      }

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
        'Invalid email or password. Please verify your credentials.';
      throw new Error(errorMessage);
    }
  },

  /**
   * Log out user via TAGAD backend API and clear local session
   * Distinguishes between local sign-out and confirmed server revocation
   */
  async logout(): Promise<{ success: boolean; serverConfirmed: boolean; error?: string }> {
    const token = localStorage.getItem('tagad_token');
    let serverConfirmed = false;
    let error: string | undefined;

    try {
      if (token) {
        await axios.post(
          apiUrl('/auth/logout'),
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        serverConfirmed = true;
      }
    } catch (err: any) {
      // Distinguish between network errors and server rejections
      if (err.response) {
        // Server responded with error status
        error = err.response?.data?.error?.message || err.response?.data?.message || 'Server rejected logout';
        // Don't clear storage if server explicitly rejects - token may still be valid
        if (err.response.status >= 400 && err.response.status < 500) {
          return { success: false, serverConfirmed: false, error };
        }
      } else if (err.request) {
        // Network error - server didn't respond
        error = 'Network error during logout - local session cleared but server not confirmed';
        // Continue with local cleanup for network errors
      } else {
        // Other errors
        error = err.message || 'Unknown error during logout';
      }
    }

    // Only clear storage if we have a reasonable expectation it's safe
    // (network errors or successful server confirmation)
    if (serverConfirmed || (error && error.includes('Network'))) {
      this.clearStorage();
      return { success: true, serverConfirmed, error };
    }

    // If we get here, something went wrong but we should still clear local storage
    // to prevent local access, even if server revocation failed
    this.clearStorage();
    return { success: false, serverConfirmed: false, error: error || 'Logout completed with warnings' };
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
      // Validate token structure and expiration
      const parts = storedToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired, attempt refresh
          const refreshToken = localStorage.getItem('tagad_refresh_token');
          if (refreshToken) {
            try {
              const refreshRes = await axios.post(apiUrl('/auth/refresh'), { refreshToken });
              const refData = refreshRes.data?.data || refreshRes.data;
              if (refData.accessToken) {
                localStorage.setItem('tagad_token', refData.accessToken);
                if (refData.refreshToken) {
                  localStorage.setItem('tagad_refresh_token', refData.refreshToken);
                }
              } else {
                this.clearStorage();
                return null;
              }
            } catch {
              this.clearStorage();
              return null;
            }
          } else {
            this.clearStorage();
            return null;
          }
        }
      }

      // Restore user from /api/auth/me
      const currentToken = localStorage.getItem('tagad_token') || storedToken;
      const response = await axios.get(apiUrl('/auth/me'), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      const resData = response.data?.data || response.data;
      const apiUser = resData;

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
    } catch {
      // Fall back to cached user in localStorage if network unavailable, or clear if invalid
      const cachedUser = localStorage.getItem('tagad_user');
      const cachedRoles = localStorage.getItem('tagad_roles');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          parsed.roles = cachedRoles ? JSON.parse(cachedRoles) : parsed.roles;
          return parsed;
        } catch {
          this.clearStorage();
          return null;
        }
      }
      this.clearStorage();
      return null;
    }
  },

  clearStorage(): void {
    localStorage.removeItem('tagad_token');
    localStorage.removeItem('tagad_refresh_token');
    localStorage.removeItem('tagad_user');
    localStorage.removeItem('tagad_roles');
  },
};
