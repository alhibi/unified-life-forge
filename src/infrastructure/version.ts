/**
 * Inlined build metadata so we never accidentally ship `import.meta.env`
 * secrets into a public chunk.
 */

export const APP_NAME = 'smarthub';
export const APP_VERSION = '1.6.0';
export const BUILD_ID = (typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev') as string;
export const COMMIT_SHA = (typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : 'local') as string;

declare const __BUILD_ID__: string | undefined;
declare const __COMMIT_SHA__: string | undefined;