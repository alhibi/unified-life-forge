/**
 * Schema-agnostic view of the generated Supabase client.
 *
 * `src/integrations/supabase/types.ts` is generated from the live database, so
 * features whose tables are provisioned separately (German Club, role storage)
 * cannot be expressed through the generated `Database` type. Those modules keep
 * their own hand-written row interfaces and query through this client, which
 * drops only the table-name/column typing while preserving the runtime client
 * (auth, realtime, storage) untouched.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as typedClient } from './client';

export const untypedSupabase = typedClient as unknown as SupabaseClient;
