import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  localGetSession,
  localSignIn,
  localSignOut,
  localSignUp,
} from './localAuthStore';

describe('localAuthStore Security and Functionality Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock crypto.subtle and crypto.getRandomValues if not fully available in jsdom
    if (typeof window !== 'undefined' && !window.crypto) {
      Object.defineProperty(window, 'crypto', {
        value: {
          subtle: {
            importKey: async () => ({}),
            deriveBits: async () => new Uint8Array(32),
          },
          getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
            return arr;
          },
          randomUUID: () => '12345678-1234-1234-1234-1234567890ab',
        },
        writable: true,
      });
    }
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should successfully sign up a new user and return a session', async () => {
    const signupRes = await localSignUp('test_user', 'Secr3tPa$$!');
    expect(signupRes.error).toBeNull();
    expect(signupRes.data).not.toBeNull();
    expect(signupRes.data?.user?.user_metadata.username).toBe('test_user');
    expect(signupRes.data?.session?.access_token).toBeDefined();

    // Verify localStorage has saved account
    const rawAccounts = localStorage.getItem('local-auth:accounts:v1');
    expect(rawAccounts).not.toBeNull();
    const accounts = JSON.parse(rawAccounts!);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].username).toBe('test_user');
    expect(accounts[0].sessionTokens).toHaveLength(1);
    expect(accounts[0].sessionTokens[0]).toBe(signupRes.data?.session?.access_token);
  });

  it('should restore a valid session', async () => {
    const signupRes = await localSignUp('test_user', 'Secr3tPa$$!');
    const session = localGetSession();
    expect(session).not.toBeNull();
    expect(session?.access_token).toBe(signupRes.data?.session?.access_token);
    expect(session?.user.id).toBe(signupRes.data?.user?.id);
  });

  it('should successfully sign in an existing user and add a session token', async () => {
    await localSignUp('test_user', 'Secr3tPa$$!');

    // Clear active session to simulate fresh page load
    localStorage.removeItem('local-auth:session:v1');
    expect(localGetSession()).toBeNull();

    const signinRes = await localSignIn('test_user', 'Secr3tPa$$!');
    expect(signinRes.error).toBeNull();
    expect(signinRes.data?.session?.access_token).toBeDefined();

    const restoredSession = localGetSession();
    expect(restoredSession).not.toBeNull();
    expect(restoredSession?.access_token).toBe(signinRes.data?.session?.access_token);

    // Ensure user has session tokens stored in their account
    const rawAccounts = localStorage.getItem('local-auth:accounts:v1');
    const accounts = JSON.parse(rawAccounts!);
    expect(accounts[0].sessionTokens).toContain(signinRes.data?.session?.access_token);
  });

  it('should prevent session hijacking via user ID spoofing/tampering', async () => {
    // Sign up normal user
    const userRes = await localSignUp('legit_user', 'Secr3tPa$$!');
    const legitUserId = userRes.data?.user?.id;
    const legitToken = userRes.data?.session?.access_token;

    // Sign up attacker user
    const attackerRes = await localSignUp('attacker', 'Attack123!');
    const attackerToken = attackerRes.data?.session?.access_token;

    // Attacker tampers with the persisted session key to claim legit_user ID
    // but keeps attacker's own session token.
    const tamperedSession = {
      userId: legitUserId,
      expiresAt: Date.now() + 1000 * 60 * 60,
      token: attackerToken, // Token belongs to attacker, not legit_user
    };
    localStorage.setItem('local-auth:session:v1', JSON.stringify(tamperedSession));

    // Restore session - should fail because attackerToken is not bound to legit_user account
    const restored = localGetSession();
    expect(restored).toBeNull();

    // Verify localStorage session has been cleared as a security measure
    expect(localStorage.getItem('local-auth:session:v1')).toBeNull();
  });

  it('should cleanup session token from stored account on sign out', async () => {
    const signupRes = await localSignUp('test_user', 'Secr3tPa$$!');
    const token = signupRes.data?.session?.access_token;

    // Sign out
    await localSignOut();
    expect(localGetSession()).toBeNull();

    // Verify token removed from accounts
    const rawAccounts = localStorage.getItem('local-auth:accounts:v1');
    const accounts = JSON.parse(rawAccounts!);
    expect(accounts[0].sessionTokens).not.toContain(token);
    expect(accounts[0].sessionTokens).toHaveLength(0);
  });

  it('should cap active sessions at 10 to prevent storage expansion attacks', async () => {
    await localSignUp('test_user', 'Secr3tPa$$!');

    // Sign in 12 times to exceed session limit of 10
    for (let i = 0; i < 12; i++) {
      await localSignIn('test_user', 'Secr3tPa$$!');
    }

    const rawAccounts = localStorage.getItem('local-auth:accounts:v1');
    const accounts = JSON.parse(rawAccounts!);
    expect(accounts[0].sessionTokens.length).toBeLessThanOrEqual(10);
  });
});
