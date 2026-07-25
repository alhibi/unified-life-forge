// Public surface of the chat feature. External code should import from
// '@/features/chat' rather than reaching into a deep path
// (docs/CONTRIBUTING.md §2.3).
//
// Scope note: this barrel covers the component and page layer. The chat data
// layer still lives at src/lib/chat/ because src/contexts/ImageUploadContext.tsx
// consumes lib/chat/mediaPipeline from outside the feature. Moving it requires
// first separating the generic media pipeline (compression, HEIC conversion)
// from the chat-specific data layer, which is tracked as a follow-up in
// docs/architecture/feature-map.md.

export { default as ChatDrawer } from './components/ChatDrawer';
export type { ChatDrawerProps, Message } from './components/types';
export { default as ChatPage } from './pages/Chat';
export { default as ChatSettingsPage } from './pages/ChatSettings';
export { default as GroupChatPage } from './pages/GroupChat';
export { default as GroupsIndexPage } from './pages/GroupsIndex';
