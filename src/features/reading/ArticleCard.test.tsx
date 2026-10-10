import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArticleCard } from './ArticleCard';
import type { Density } from './listPrefs';
import type { FeedItem } from './types';

vi.mock('./ArticleContextMenu', () => ({ ArticleContextMenu: ({ children }: { children: React.ReactNode }) => children }));

afterEach(cleanup);

const article: FeedItem = { title: 'article', description: 'summary', source: 'source', link: 'https://example.org/story', image: null, pubDate: '' };

describe('article release activation', () => {
  for (const density of ['compact', 'comfortable', 'cards'] as const satisfies readonly Density[]) {
    it(`opens ${density} only on release, not pointerdown`, () => {
      const open = vi.fn();
      render(<ArticleCard article={article} index={0} density={density} isRead={false} isBookmarked={false} language="ar" onOpen={open} onToggleBookmark={() => {}} />);
      const target = screen.getAllByRole('button')[0];
      fireEvent.pointerDown(target, { button: 0 });
      expect(open).not.toHaveBeenCalled();
      fireEvent.click(target);
      expect(open).toHaveBeenCalledTimes(1);
    });
  }
  it('saving does not open the article', () => {
    const open = vi.fn();
    const save = vi.fn();
    render(<ArticleCard article={article} index={0} isRead={false} isBookmarked={false} language="ar" onOpen={open} onToggleBookmark={save} />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
  });
});