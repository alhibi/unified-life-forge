import { describe, expect, it } from 'vitest';

import { sanitizeRssHtml } from '../sanitizeRssHtml';

describe('sanitizeRssHtml', () => {
  it('keeps article prose and images', () => {
    const html = '<p>نص المقال الأصلي هنا.</p><img src="https://a.test/x.jpg" alt="صورة">';
    const out = sanitizeRssHtml(html);
    expect(out).toContain('نص المقال الأصلي هنا.');
    expect(out).toContain('https://a.test/x.jpg');
  });

  it('drops "read also" rails and their link list', () => {
    const html = [
      '<p>مقدمة المقال.</p>',
      '<h3>اقرأ أيضاً</h3>',
      '<ul><li><a href="https://a.test/1">خبر آخر</a></li>',
      '<li><a href="https://a.test/2">خبر ثالث</a></li></ul>',
      '<p>تكملة المقال.</p>',
    ].join('');
    const out = sanitizeRssHtml(html);
    expect(out).toContain('مقدمة المقال.');
    expect(out).toContain('تكملة المقال.');
    expect(out).not.toContain('اقرأ أيضاً');
    expect(out).not.toContain('خبر آخر');
  });

  it('removes link-only short paragraphs', () => {
    const html = '<p>نص حقيقي طويل بما يكفي ليبقى داخل المقال.</p>'
      + '<p><a href="https://a.test/x">شارك المقال</a></p>';
    const out = sanitizeRssHtml(html);
    expect(out).not.toContain('شارك المقال');
    expect(out).toContain('نص حقيقي');
  });

  it('still strips scripts and event handlers', () => {
    const out = sanitizeRssHtml('<p onclick="x()">آمن</p><script>alert(1)</script>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('onclick');
    expect(out).toContain('آمن');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeRssHtml('')).toBe('');
  });
});
