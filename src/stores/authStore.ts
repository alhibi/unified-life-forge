import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserProfile } from '../utils/validation/schemas';
export interface AuthState { isAuthenticated: boolean; user: UserProfile | null; token: string | null; isInitializing: boolean; lastLogin: string | null; }
export interface AuthActions { login: (user: UserProfile, token: string) => void; logout: () => void; updateProfile: (profileUpdates: Partial<UserProfile>) => void; setInitializing: (isInitializing: boolean) => void; }
const initialAuthState: AuthState = { isAuthenticated: false, user: null, token: null, isInitializing: true, lastLogin: null };
export const useAuthStore = create<AuthState & AuthActions>()(
  persist((set) => ({ ...initialAuthState, login: (user, token) => set({ isAuthenticated: true, user, token, lastLogin: new Date().toISOString(), isInitializing: false }), logout: () => { try { Object.keys(localStorage).forEach(key => { if (key.includes('draft') || key.includes('cache')) localStorage.removeItem(key); }); } catch(e) {} set({ ...initialAuthState, isInitializing: false }); }, updateProfile: (profileUpdates) => set((state) => { if (!state.user) return state; return { user: { ...state.user, ...profileUpdates, updated_at: new Date().toISOString() } }; }), setInitializing: (isInitializing) => set({ isInitializing }) }),
  { name: 'zen-elite-auth-store', storage: createJSONStorage(() => localStorage), partialize: (state) => ({ isAuthenticated: state.isAuthenticated, user: state.user, token: state.token, lastLogin: state.lastLogin }) })
);
