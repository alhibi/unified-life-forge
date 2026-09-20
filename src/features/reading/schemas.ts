import { z } from 'zod';

export const feedStatusSchema = z.object({
  url: z.string().url(),
  status: z.enum(['ok', 'not_modified', 'error']),
  httpStatus: z.number().int().optional(),
  itemCount: z.number().int().nonnegative(),
  error: z.string().optional(),
});

export const feedItemSchema = z.object({
  title: z.string().catch(''),
  link: z.string().catch(''),
  description: z.string().catch(''),
  fullContent: z.string().optional(),
  pubDate: z.string().catch(''),
  image: z.string().nullable().catch(null),
  images: z.array(z.string()).optional(),
  author: z.string().optional(),
  source: z.string().catch(''),
});

const edgeFeedItemSchema = feedItemSchema.omit({ source: true });

export const fetchRssResponseSchema = z.object({
  statuses: z.array(feedStatusSchema).optional(),
  feeds: z.array(z.object({
    url: z.string().optional(),
    items: z.array(edgeFeedItemSchema).optional().default([]),
  })).optional().default([]),
  requestId: z.string().optional(),
});

export const extractedArticleSchema = z.object({
  url: z.string(),
  title: z.string().catch(''),
  siteName: z.string().optional(),
  description: z.string().optional(),
  image: z.string().nullable().catch(null),
  html: z.string().catch(''),
  partial: z.boolean().optional(),
  extractable: z.boolean().optional(),
});

export type FetchRssResponse = z.infer<typeof fetchRssResponseSchema>;