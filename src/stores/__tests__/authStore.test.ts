import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserProfile } from '../../utils/validation/schemas';
import { useAuthStore } from '../authStore';

describe('useAuthStore Zustand Engine', () => {
  const mockUser: UserProfile = {
    id: '1a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6f',
    email: 'jules@zen.co',
    username: 'jules_verne',
    full_name: 'Jules Verne',
    preferences: {
      theme: 'obsidian',
      language: 'en',
      sound_enabled: true,
      vibration_enabled: true,
      reduced_motion: false,
      data_saver: false,
      battery_saver: false,
    },
  };

  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      isInitializing: true,
      lastLogin: null,
      lastError: null,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should sign in a user with schema verification', () => {
    const store = useAuthStore.getState();
    store.login(mockUser, 'auth_token_123');

    const updatedStore = useAuthStore.getState();
    expect(updatedStore.isAuthenticated).toBe(true);
    expect(updatedStore.user).toEqual(mockUser);
    expect(updatedStore.token).toBe('auth_token_123');
    expect(updatedStore.lastLogin).not.toBeNull();
  });

  it('should decline login if profile violates schema', () => {
    const badUser = { ...mockUser, email: 'not-a-valid-email' };
    const store = useAuthStore.getState();
    store.login(badUser as any, 'auth_token_123');

    const updatedStore = useAuthStore.getState();
    expect(updatedStore.isAuthenticated).toBe(false);
    expect(updatedStore.user).toBeNull();
    expect(updatedStore.lastError).toContain('Login Schema Violation');
  });

  it('should update profile and successfully validate with Zod', () => {
    const store = useAuthStore.getState();
    store.login(mockUser, 'auth_token_123');

    const updateRes = useAuthStore.getState().updateProfile({
      full_name: 'Jules Captain',
    });

    expect(updateRes.success).toBe(true);
    expect(useAuthStore.getState().user?.full_name).toBe('Jules Captain');
  });

  it('should rollback transaction if updated profile violates schemas', () => {
    const store = useAuthStore.getState();
    store.login(mockUser, 'auth_token_123');

    const updateRes = useAuthStore.getState().updateProfile({
      full_name: 'J', // too short, schema enforces min length 2!
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.error).toBeDefined();

    // The user object should have successfully rolled back to its initial state
    expect(useAuthStore.getState().user?.full_name).toBe('Jules Verne');
  });

  it('should clear stored session, drafts and caches on logout', () => {
    localStorage.setItem('user-draft-pkm', 'my raw draft');
    localStorage.setItem('query-cache-profile', 'cache values');

    const store = useAuthStore.getState();
    store.login(mockUser, 'auth_token_123');
    store.logout();

    const clearedStore = useAuthStore.getState();
    expect(clearedStore.isAuthenticated).toBe(false);
    expect(clearedStore.user).toBeNull();
    expect(clearedStore.token).toBeNull();

    // Drafts and caches should be purged
    expect(localStorage.getItem('user-draft-pkm')).toBeNull();
    expect(localStorage.getItem('query-cache-profile')).toBeNull();
  });
});
