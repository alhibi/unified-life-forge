import React from 'react';
import { describe, expect,it } from 'vitest';

import { parseSnippet, renderSearchSnippet } from './useChatSearch';

describe('chat search snippet parsing and rendering', () => {
  describe('parseSnippet', () => {
    it('returns an empty array for empty or missing input', () => {
      expect(parseSnippet('')).toEqual([]);
    });

    it('parses a standard single highlighted match correctly', () => {
      const result = parseSnippet('hello <mark>world</mark> test');
      expect(result).toEqual([
        { text: 'hello ', isMatch: false },
        { text: 'world', isMatch: true },
        { text: ' test', isMatch: false },
      ]);
    });

    it('parses multiple sequential highlighted matches', () => {
      const result = parseSnippet('<mark>hello</mark> middle <mark>world</mark>');
      expect(result).toEqual([
        { text: 'hello', isMatch: true },
        { text: ' middle ', isMatch: false },
        { text: 'world', isMatch: true },
      ]);
    });

    it('handles unbalanced opening mark tag gracefully', () => {
      const result = parseSnippet('hello <mark>world');
      expect(result).toEqual([
        { text: 'hello ', isMatch: false },
        { text: 'world', isMatch: false },
      ]);
    });

    it('handles unbalanced closing mark tag gracefully', () => {
      const result = parseSnippet('hello </mark> world');
      expect(result).toEqual([
        { text: 'hello  world', isMatch: false },
      ]);
    });

    it('handles nested or malformed mark tags defensively', () => {
      const result = parseSnippet('<mark>hello <mark>world</mark> test</mark>');
      // Inner mark tags are defensively stripped out from the extracted segments
      expect(result).toEqual([
        { text: 'hello world', isMatch: true },
        { text: ' test', isMatch: false },
      ]);
    });

    it('handles tags with attributes defensively', () => {
      // Tags like <mark class="x"> are not matched as standard MARK_OPEN
      // and are cleaned of any nested <mark> tags inside the text.
      const result = parseSnippet('foo <mark class="high">bar</mark> baz');
      expect(result).toEqual([
        { text: 'foo <mark class="high">bar baz', isMatch: false },
      ]);
    });

    it('handles snippets with other HTML/XSS payloads safely', () => {
      const result = parseSnippet('foo <script>alert(1)</script> <mark>bar</mark>');
      expect(result).toEqual([
        { text: 'foo <script>alert(1)</script> ', isMatch: false },
        { text: 'bar', isMatch: true },
      ]);
    });
  });

  describe('renderSearchSnippet', () => {
    it('renders segments as safe React element trees', () => {
      const result = renderSearchSnippet('hello <mark>world</mark> test') as any[];
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);

      expect(result[0].type).toBe('span');
      expect(result[0].props.children).toBe('hello ');

      expect(result[1].type).toBe('mark');
      expect(result[1].props.children).toBe('world');

      expect(result[2].type).toBe('span');
      expect(result[2].props.children).toBe(' test');
    });

    it('does not evaluate malicious HTML payloads when rendered', () => {
      const result = renderSearchSnippet('<script>alert("XSS")</script> <mark>secure</mark>') as any[];
      expect(result.length).toBe(2);

      // The non-match span has the script tag as literal plain text children,
      // which is 100% safe from XSS execution because React renders children as safe text nodes.
      expect(result[0].type).toBe('span');
      expect(result[0].props.children).toBe('<script>alert("XSS")</script> ');

      expect(result[1].type).toBe('mark');
      expect(result[1].props.children).toBe('secure');
    });
  });
});
