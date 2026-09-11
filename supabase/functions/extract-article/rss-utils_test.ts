import {
  assert,
  assertFalse,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { cleanArticleHtml } from "../_shared/rss-utils.ts";

Deno.test("cleanArticleHtml preserves publisher images wrapped in paragraphs", () => {
  const prose = "هذا نص المقال الكامل الذي يشرح الخبر وتفاصيله المهمة للقراء. ".repeat(8);
  const html = [
    `<p>${prose}</p>`,
    '<p><img src="https://news.example/story-photo.jpg" alt="صورة الخبر"></p>',
    `<p>${prose}</p>`,
  ].join("");

  const cleaned = cleanArticleHtml(html, "عنوان الخبر");

  assertStringIncludes(cleaned, '<p><img src="https://news.example/story-photo.jpg"');
  assertStringIncludes(cleaned, 'alt="صورة الخبر"');
});

Deno.test("cleanArticleHtml still removes genuinely empty paragraphs", () => {
  const prose = "هذا نص المقال الكامل الذي يشرح الخبر وتفاصيله المهمة للقراء. ".repeat(8);
  const cleaned = cleanArticleHtml(`<p>${prose}</p><p> </p><p>${prose}</p>`);

  assertFalse(cleaned.includes("<p></p>"));
  assert(cleaned.length > 0);
});