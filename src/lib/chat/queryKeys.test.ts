import { describe, it, expect } from 'vitest';
import { chatKeys } from './queryKeys';

describe('chatKeys factory', () => {
  it('top-level "all" prefix is stable', () => {
    expect(chatKeys.all).toEqual(['chat']);
  });

  it('list / chat / members hierarchy', () => {
    expect(chatKeys.list()).toEqual(['chat', 'list']);
    expect(chatKeys.chat('A')).toEqual(['chat', 'chat', 'A']);
    expect(chatKeys.members('A')).toEqual(['chat', 'chat', 'A', 'members']);
  });

  it('messages keys are prefixed by chat key (so invalidating a chat invalidates its messages)', () => {
    const chat = chatKeys.chat('B');
    const msgs = chatKeys.messages('B');
    const inf  = chatKeys.messagesInfinite('B');
    expect(msgs.slice(0, chat.length)).toEqual([...chat]);
    expect(inf.slice(0, msgs.length)).toEqual([...msgs]);
  });

  it('reactions keys reside under the chat subtree (cross-message scoping)', () => {
    const chat = chatKeys.chat('C');
    const rx   = chatKeys.reactions('C');
    expect(rx.slice(0, chat.length)).toEqual([...chat]);
  });

  it('reactionsForMessage is global (not nested under a chat) — supports invalidation by message id', () => {
    expect(chatKeys.reactionsForMessage('m-1'))
      .toEqual(['chat', 'reactions', 'm-1']);
  });

  it('attachments key includes optional kind segment', () => {
    expect(chatKeys.attachments('Z')).toEqual(['chat', 'chat', 'Z', 'attachments']);
    expect(chatKeys.attachments('Z', 'image'))
      .toEqual(['chat', 'chat', 'Z', 'attachments', 'image']);
  });

  it('search keys are unique per query and chat', () => {
    expect(chatKeys.search('A', 'hello')).toEqual(['chat', 'chat', 'A', 'search', 'hello']);
    expect(chatKeys.searchGlobal('hello')).toEqual(['chat', 'search', 'hello']);
    expect(chatKeys.search('A', 'hello'))
      .not.toEqual(chatKeys.search('A', 'goodbye'));
  });

  it('keys are stable across calls (reference inequality OK, value equality required)', () => {
    expect(chatKeys.list()).toEqual(chatKeys.list());
    expect(chatKeys.chat('X')).toEqual(chatKeys.chat('X'));
  });
});
