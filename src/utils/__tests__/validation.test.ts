import { describe, expect, it } from 'vitest';

import {
  authCredentialsSchema,
  chatMessageSchema,
  pkmNoteSchema,
  profileSchema,
  validatePayload,
} from '../validation';
import {
  createApiResponseSchema,
  isPKMNote,
  isUserProfile,
  UserProfileSchema,
} from '../validation/schemas';

describe('Zod Validation Schemas', () => {
  describe('authCredentialsSchema', () => {
    it('validates correct credentials', () => {
      const data = { username: 'test_user123', password: 'password123' };
      const parsed = validatePayload(authCredentialsSchema, data);
      expect(parsed).toEqual(data);
    });

    it('rejects usernames that are too short', () => {
      const data = { username: 'te', password: 'password123' };
      expect(() => validatePayload(authCredentialsSchema, data)).toThrow(
        'Validation Error: Username must be at least 3 characters long',
      );
    });

    it('rejects passwords that are too short', () => {
      const data = { username: 'user123', password: '123' };
      expect(() => validatePayload(authCredentialsSchema, data)).toThrow(
        'Validation Error: Password must be at least 6 characters long',
      );
    });

    it('rejects usernames with special characters', () => {
      const data = { username: 'user-123', password: 'password123' };
      expect(() => validatePayload(authCredentialsSchema, data)).toThrow(
        'Validation Error: Username can only contain English letters, digits, and underscores',
      );
    });
  });

  describe('profileSchema', () => {
    it('validates correct profile data', () => {
      const data = {
        username: 'valid_user',
        display_name: 'Valid Name',
        avatar_url: 'https://example.com/avatar.png',
        bio: 'Hello, this is my secure bio.',
      };
      const parsed = validatePayload(profileSchema, data);
      expect(parsed).toEqual(data);
    });

    it('rejects too long bios', () => {
      const data = {
        username: 'user',
        bio: 'a'.repeat(161),
      };
      expect(() => validatePayload(profileSchema, data)).toThrow(
        'Validation Error: Bio cannot exceed 160 characters',
      );
    });
  });

  describe('chatMessageSchema', () => {
    it('validates a message under max length', () => {
      const data = { content: 'hello world', message_type: 'text' };
      const parsed = validatePayload(chatMessageSchema, data);
      expect(parsed.content).toBe('hello world');
    });

    it('rejects extremely long message', () => {
      const data = { content: 'a'.repeat(4097) };
      expect(() => validatePayload(chatMessageSchema, data)).toThrow(
        'Validation Error: Message content cannot exceed 4096 characters',
      );
    });
  });

  describe('pkmNoteSchema', () => {
    it('validates valid note inputs', () => {
      const data = {
        title: 'Deep Thought',
        content: 'I think, therefore I am.',
        tags: ['philosophical', 'short'],
        status: 'active',
      };
      const parsed = validatePayload(pkmNoteSchema, data);
      expect(parsed).toEqual(data);
    });

    it('rejects blank titles', () => {
      const data = {
        title: '',
        content: 'content',
        tags: [],
      };
      expect(() => validatePayload(pkmNoteSchema, data)).toThrow(
        'Validation Error: Title is required',
      );
    });
  });

  describe('Enterprise Schemas & Type Guards', () => {
    it('validates and guards UserProfile models', () => {
      const validProfile = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        email: 'jules@zen.co',
        username: 'jules_architect',
        full_name: 'Jules Verne',
        preferences: {
          theme: 'obsidian',
          language: 'ar',
          sound_enabled: true,
          vibration_enabled: false,
          reduced_motion: true,
          data_saver: true,
          battery_saver: false,
        },
      };

      expect(isUserProfile(validProfile)).toBe(true);
      expect(isUserProfile({ ...validProfile, email: 'not-an-email' })).toBe(false);
    });

    it('validates and guards PKMNotes', () => {
      const validNote = {
        id: '2a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6e',
        title: 'Architectural Mastery',
        content: 'Zen Elite guidelines build perfect apps.',
        tags: [
          { id: '1a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6f', name: 'Elite', color: '#B8492E' },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false,
        status: 'active',
      };

      expect(isPKMNote(validNote)).toBe(true);
      expect(isPKMNote({ ...validNote, id: 'bad-uuid' })).toBe(false);
    });

    it('generates correct enveloped api schemas', () => {
      const profileListSchema = createApiResponseSchema(UserProfileSchema);
      const envelopePayload = {
        data: {
          id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
          email: 'jules@zen.co',
          username: 'jules_architect',
          full_name: 'Jules Verne',
        },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          processing_time_ms: 12,
        },
        status: 'success',
      };

      const parsed = profileListSchema.safeParse(envelopePayload);
      expect(parsed.success).toBe(true);
    });
  });
});
