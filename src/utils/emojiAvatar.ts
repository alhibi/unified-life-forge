const APPLE_EMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64';

export const EMOJI_AVATARS = [
  { id: 'fox', emoji: '🦊', code: '1f98a', label: 'ثعلب' },
  { id: 'cat', emoji: '🐱', code: '1f431', label: 'قطة' },
  { id: 'owl', emoji: '🦉', code: '1f989', label: 'بومة' },
  { id: 'wolf', emoji: '🐺', code: '1f43a', label: 'ذئب' },
  { id: 'bear', emoji: '🐻', code: '1f43b', label: 'دب' },
  { id: 'lion', emoji: '🦁', code: '1f981', label: 'أسد' },
  { id: 'eagle', emoji: '🦅', code: '1f985', label: 'نسر' },
  { id: 'dolphin', emoji: '🐬', code: '1f42c', label: 'دلفين' },
];

export const isEmojiAvatarValue = (value: string) =>
  EMOJI_AVATARS.some(a => a.emoji === value);

export const getAppleEmojiUrl = (emoji: string): string | null => {
  const animal = EMOJI_AVATARS.find(a => a.emoji === emoji);
  if (!animal) return null;
  return `${APPLE_EMOJI_CDN}/${animal.code}.png`;
};
