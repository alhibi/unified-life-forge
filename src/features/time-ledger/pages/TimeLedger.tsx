/**
 * Time Ledger Page — Unified timeline of all user activity.
 *
 * Route: /time-ledger
 * Category: mind (العقل)
 */

import { Helmet } from 'react-helmet-async';

import { PageShell } from '@/components/ui/app-shell';
import TimeLedgerView from '../components/TimeLedgerView';

export default function TimeLedger() {
  return (
    <PageShell>
      <Helmet>
        <title>سِجل الزمن — amv.life</title>
        <meta
          name="description"
          content="سجل زمني موحد لجميع أنشطتك: التقويم، العادات، اللياقة، الطقس، المعرفة، والمزيد"
        />
        <link rel="canonical" href="https://amv.life/time-ledger" />
        <meta property="og:title" content="سِجل الزمن — amv.life" />
        <meta
          property="og:description"
          content="سجل زمني موحد لجميع أنشطتك: التقويم، العادات، اللياقة، الطقس، المعرفة، والمزيد"
        />
        <meta property="og:url" content="https://amv.life/time-ledger" />
      </Helmet>

      <TimeLedgerView />
    </PageShell>
  );
}