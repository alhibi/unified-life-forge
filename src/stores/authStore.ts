import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { UserProfile, UserProfileSchema } from '../utils/validation/schemas';

// ============================================================================
// State & Action Interfaces
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  isInitializing: boolean;
  lastLogin: string | null;
  lastError: string | null;
}

export interface AuthActions {
  /**
   * Logs in a user, validates the profile object with Zod, and records login timestamps.
   */
  login: (user: UserProfile, token: string) => void;

  /**
   * Logs out the user and cleanses draft/cache objects safely from localStorage.
   */
  logout: () => void;

  /**
   * Updates user profile with transaction safety. Rolls back on schema violations or execution failure.
   */
  updateProfile: (profileUpdates: Partial<UserProfile>) => { success: boolean; error: string | null };

  /**
   * Sets store initialization flag.
   */
  setInitializing: (isInitializing: boolean) => void;

  /**
   * Resets any persistent error flags in the state.
   */
  clearError: () => void;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isInitializing: true,
  lastLogin: null,
  lastError: null,
};

// ============================================================================
// Secure Authenticated Zustand Store
// ============================================================================

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialAuthState,

      login: (user, token) => {
        try {
          // Validate incoming profile against the strict UserProfileSchema
          const validatedUser = UserProfileSchema.parse(user);

          set({
            isAuthenticated: true,
            user: validatedUser,
            token,
            lastLogin: new Date().toISOString(),
            isInitializing: false,
            lastError: null,
          });
        } catch (err: any) {
          console.error('[AuthStore] Login failed due to invalid profile payload schema:', err);
          set({
            lastError: `Login Schema Violation: ${err?.message || 'Invalid format'}`,
            isInitializing: false,
          });
        }
      },

      logout: () => {
        try {
          // Safely prune drafts and query caches to protect user privacy
          Object.keys(localStorage).forEach((key) => {
            if (key.includes('draft') || key.includes('cache')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.error('[AuthStore] Error purging localStorage on logout:', e);
        }

        set({
          ...initialAuthState,
          isInitializing: false,
        });
      },

      updateProfile: (profileUpdates) => {
        const state = get();
        if (!state.user) {
          return { success: false, error: 'Cannot update profile: No active session' };
        }

        // Backup current profile state for transactional rollback safety
        const backupUser = { ...state.user };
        const mergedUser = {
          ...state.user,
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        };

        try {
          // Parse merged object with Zod to enforce system compliance
          const validatedUser = UserProfileSchema.parse(mergedUser);
          set({ user: validatedUser, lastError: null });
          return { success: true, error: null };
        } catch (err: any) {
          console.error('[AuthStore] Profile update rejected. Rollback executed.', err);

          // Execute transactional rollback to preserve state consistency
          set({ user: backupUser, lastError: err?.message || 'Rollback triggered' });
          return { success: false, error: err?.message || 'Invalid profile updates' };
        }
      },

      setInitializing: (isInitializing) => set({ isInitializing }),

      clearError: () => set({ lastError: null }),
    }),
    {
      name: 'zen-elite-auth-store',
      storage: createJSONStorage(() => localStorage),
      // Selectively persist only critical credentials
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        lastLogin: state.lastLogin,
      }),
    }
  )
);
