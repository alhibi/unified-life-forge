// Barrel for the new chat data layer.
//
// Importing from `@/lib/chat` (without a sub-path) gets every public symbol
// the layer exposes. Internal modules still import from each other directly
// to keep the dependency graph easy to reason about.

export * as api from './api';
export * from './clientId';
export * from './errors';
export * from './hooks';
export * as idbCache from './idbCache';
export * as notifications from './notifications';
export * as performance from './performance';
export * from './queryKeys';
export * from './settings';
export * from './types';
