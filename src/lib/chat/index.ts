// Barrel for the new chat data layer.
//
// Importing from `@/lib/chat` (without a sub-path) gets every public symbol
// the layer exposes. Internal modules still import from each other directly
// to keep the dependency graph easy to reason about.

export * from './types';
export * from './queryKeys';
export * from './clientId';
export * from './errors';
export * from './settings';
export * from './hooks';
export * as api from './api';
export * as idbCache from './idbCache';
