import { z } from 'zod';

// Username constraints mapping to useAuth: 3–24 chars, letters, digits, underscore only
export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters long' })
  .max(24, { message: 'Username must be at most 24 characters long' })
  .regex(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain English letters, digits, and underscores',
  });

// Password constraints: 6-128 characters
export const passwordSchema = z
  .string()
  .min(6, { message: 'Password must be at least 6 characters long' })
  .max(128, { message: 'Password must be at most 128 characters long' });

// Auth credentials validation schema
export const authCredentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

// Profile validation schema
export const profileSchema = z.object({
  username: usernameSchema,
  display_name: z
    .string()
    .max(50, { message: 'Display name cannot exceed 50 characters' })
    .nullable()
    .optional(),
  avatar_url: z
    .string()
    .url({ message: 'Invalid avatar URL format' })
    .or(z.string().length(0))
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(160, { message: 'Bio cannot exceed 160 characters' })
    .nullable()
    .optional(),
});

// Chat message validation schema
export const chatMessageSchema = z.object({
  content: z
    .string()
    .max(4096, { message: 'Message content cannot exceed 4096 characters' }),
  message_type: z.enum(['text', 'image', 'voice', 'file', 'system']).default('text'),
  file_name: z.string().max(255).optional().nullable(),
  file_size: z.number().nonnegative().optional().nullable(),
});

// PKM notes validation schema
export const pkmNoteSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(150, { message: 'Title cannot exceed 150 characters' }),
  content: z
    .string()
    .max(50000, { message: 'Note content cannot exceed 50000 characters' }),
  tags: z.array(z.string().max(30)).max(20, { message: 'Cannot have more than 20 tags' }),
  status: z.enum(['active', 'archived', 'trash']).default('active'),
});

/**
 * Validates any payload against a schema. Returns sanitized data on success, or throws localized error.
 */
export function validatePayload<T>(schema: z.Schema<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join(', ');
    throw new Error(`Validation Error: ${issues}`);
  }
  return result.data;
}
