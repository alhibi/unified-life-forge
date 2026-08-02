import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// We prefix the variable with "mock" so that Vitest allows referencing it in the hoisted vi.mock factory.
let mockShouldFail = false;

// Mock the dynamic import of @emoji-mart/data
vi.mock('@emoji-mart/data', () => {
  return {
    get default() {
      if (mockShouldFail) {
        throw new Error('Network error');
      }
      return {
        emojis: {
          smiley: {
            skins: [
              { unified: '1f603', native: '😃' },
              { unified: '1f603-1f3fb', native: '😃🏻' },
            ],
          },
          thumbsup: {
            skins: [
              { unified: '1f44d', native: '👍' },
              { unified: '1f44d-1f3fb', native: '👍🏻' },
            ],
          },
        },
      };
    },
  };
});

describe('appleEmoji', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockShouldFail = false;
  });

  describe('getAppleEmojiPngUrl', () => {
    it('constructs correct CDN URL for standard unified codepoint', async () => {
      const { getAppleEmojiPngUrl } = await import('../appleEmoji');
      const unified = '1f603';
      const url = getAppleEmojiPngUrl(unified);
      expect(url).toBe(
        'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/1f603.png',
      );
    });

    it('constructs correct CDN URL for multi-codepoint sequences', async () => {
      const { getAppleEmojiPngUrl } = await import('../appleEmoji');
      const unified = '1f44d-1f3fb';
      const url = getAppleEmojiPngUrl(unified);
      expect(url).toBe(
        'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/1f44d-1f3fb.png',
      );
    });
  });

  describe('isAppleEmojiReady and preloadAppleEmoji', () => {
    it('is false initially, and becomes true after preloading', async () => {
      const { isAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');
      expect(isAppleEmojiReady()).toBe(false);

      await preloadAppleEmoji();

      expect(isAppleEmojiReady()).toBe(true);
    });

    it('deduplicates concurrent calls to preloadAppleEmoji', async () => {
      const { preloadAppleEmoji } = await import('../appleEmoji');
      const promise1 = preloadAppleEmoji();
      const promise2 = preloadAppleEmoji();

      expect(promise1).toBe(promise2);
      await promise1;
    });

    it('handles import failures gracefully by console warning and not breaking', async () => {
      mockShouldFail = true;
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { isAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');

      expect(isAppleEmojiReady()).toBe(false);

      await preloadAppleEmoji();

      expect(isAppleEmojiReady()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[appleEmoji] failed to load @emoji-mart/data; falling back to native emoji',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('onAppleEmojiReady', () => {
    it('registers a subscriber and calls it when loading completes', async () => {
      const { onAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');
      const callback = vi.fn();

      onAppleEmojiReady(callback);
      expect(callback).not.toHaveBeenCalled();

      await preloadAppleEmoji();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('fires callback synchronously if already loaded', async () => {
      const { onAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');
      await preloadAppleEmoji();

      const callback = vi.fn();
      onAppleEmojiReady(callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('allows unsubscribing', async () => {
      const { onAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');
      const callback = vi.fn();

      const unsubscribe = onAppleEmojiReady(callback);
      unsubscribe();

      await preloadAppleEmoji();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('renderTextWithAppleEmoji', () => {
    it('returns an empty array when given empty text', async () => {
      const { renderTextWithAppleEmoji } = await import('../appleEmoji');
      const nodes = renderTextWithAppleEmoji('');
      expect(nodes).toEqual([]);
    });

    it('returns plain text unmodified when mapping is not loaded yet', async () => {
      const { renderTextWithAppleEmoji } = await import('../appleEmoji');
      const text = 'Hello 😀 world!';
      const nodes = renderTextWithAppleEmoji(text);
      expect(nodes).toEqual([text]);
    });

    it('correctly replaces native emojis with img elements when mapping is loaded', async () => {
      const { renderTextWithAppleEmoji, preloadAppleEmoji, getAppleEmojiPngUrl } =
        await import('../appleEmoji');
      await preloadAppleEmoji();

      const text = 'Hello 😃 and 👍🏻!';
      const nodes = renderTextWithAppleEmoji(text, 'prefix');

      expect(nodes).toHaveLength(5);
      expect(nodes[0]).toBe('Hello ');

      // First emoji (😃)
      const img1 = nodes[1] as any;
      expect(React.isValidElement(img1)).toBe(true);
      expect(img1.type).toBe('img');
      expect(img1.key).toBe('prefix-e0');
      expect(img1.props.src).toBe(getAppleEmojiPngUrl('1f603'));
      expect(img1.props.alt).toBe('😃');

      expect(nodes[2]).toBe(' and ');

      // Second emoji (👍🏻) - multi-codepoint sequence should match first before standard 👍
      const img2 = nodes[3] as any;
      expect(React.isValidElement(img2)).toBe(true);
      expect(img2.type).toBe('img');
      expect(img2.key).toBe('prefix-e1');
      expect(img2.props.src).toBe(getAppleEmojiPngUrl('1f44d-1f3fb'));
      expect(img2.props.alt).toBe('👍🏻');

      expect(nodes[4]).toBe('!');
    });

    it('handles image fallback correctly when image onError is triggered', async () => {
      const { renderTextWithAppleEmoji, preloadAppleEmoji } = await import('../appleEmoji');
      await preloadAppleEmoji();

      const text = '😃';
      const nodes = renderTextWithAppleEmoji(text, 'err');
      const img = nodes[0] as any;

      expect(img.props.onError).toBeDefined();

      // Simulate onError
      const mockReplaceWith = vi.fn();
      const mockImgElement = {
        currentTarget: {
          replaceWith: mockReplaceWith,
        },
      };

      const mockSpanElement = {
        textContent: '',
      } as unknown as HTMLSpanElement;

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockSpanElement);

      img.props.onError(mockImgElement as unknown as React.SyntheticEvent<HTMLImageElement>);

      expect(createElementSpy).toHaveBeenCalledWith('span');
      expect(mockSpanElement.textContent).toBe('😃');
      expect(mockReplaceWith).toHaveBeenCalledWith(mockSpanElement);

      createElementSpy.mockRestore();
    });
  });

  describe('useAppleEmojiReady hook', () => {
    it('returns isAppleEmojiReady status and subscribes on mount', async () => {
      const { useAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');

      const { result } = renderHook(() => useAppleEmojiReady());
      expect(result.current).toBe(false);

      // Verify lazy loading of the preload is triggered on mount
      await act(async () => {
        await preloadAppleEmoji();
      });

      expect(result.current).toBe(true);
    });

    it('returns true immediately on mount if already ready', async () => {
      const { useAppleEmojiReady, preloadAppleEmoji } = await import('../appleEmoji');
      await preloadAppleEmoji();

      const { result } = renderHook(() => useAppleEmojiReady());
      expect(result.current).toBe(true);
    });
  });
});
