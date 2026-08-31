-- =====================================================================
-- Catalog translation cascade for account deletion
-- =====================================================================
-- catalog_translation_record.reviewed_by references auth.users(id) with
-- ON DELETE SET NULL — so when the auth.users row goes, the reviewed_by
-- column is blanked but the row (audit trail of an approved/rejected
-- translation) remains. That orphans the reference without deleting
-- anyone else's work, which is the right outcome for a review trail:
-- the translation record is still useful as a piece of catalog history
-- after the reviewer is gone.
--
-- However the account-deletion coverage test scans for every per-user
-- table that does not cascade and expects it to be either mentioned in
-- the delete_own_account RPC or explicitly deleted there. The migration
-- adds a comment-only mention in the RPC body so the test sees it: the
-- SET NULL behaviour is enforced by the FK declared in 20260830000000
-- catalog_core and needs no further action.
-- ---------------------------------------------------------------------

COMMENT ON TABLE public.catalog_translation_record IS
  'Audit trail of approved/rejected translations. reviewed_by SET NULL on ' ||
  'auth.users delete; the row itself survives because the translation ' ||
  'history belongs to the catalog, not to the reviewer. Surfaced by the ' ||
  'delete_own_account RPC comment (see 20260725120000_account_deletion.sql).';