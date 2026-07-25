// Public surface of the account / privacy feature. External code imports from
// '@/features/account' only (docs/CONTRIBUTING.md §2.3).

export { buildAccountExport, deleteOwnAccount, EXPORT_SOURCES } from './api';
export { default as AccountPrivacySection } from './components/AccountPrivacySection';
export type { AccountExport, ExportResult, ExportSource } from './types';
