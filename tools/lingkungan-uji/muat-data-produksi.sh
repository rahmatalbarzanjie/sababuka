#!/bin/bash
# Salin data produksi (tanpa PII, rahasia, sesi, audit) ke DB uji lokal. Hanya BACA dari produksi.
KEY=~/.ssh/sababuka_vps_ed25519
REMOTE="ssh -i $KEY sababuka@31.97.105.154"
LOCAL="wsl -d Ubuntu -u postgres -- psql -q -v ON_ERROR_STOP=1 -d sababuka_test"
TABLES="categories connector_runs connector_staging_values data_batches data_resources data_source_integrations data_sources dataset_versions datasets feature_flags geographies indicator_datasets indicator_organizations indicator_source_audits indicator_source_mappings indicator_versions indicators menu_items metadata_profiles observation_conflict_decisions observations opd_digital_profiles organization_memberships organizations periods permissions policy_focuses publication_items publications role_menu_items role_permissions roles system_settings targets units user_role_assignments validation_issues workflow_actions submission_guidance_notes"
ALL="$TABLES users"
# kosongkan semua tabel data lokal (kecuali ledger migrasi)
$LOCAL -c "TRUNCATE $(for t in $ALL assistant_citations assistant_messages assistant_sessions audit_events auth_sessions notifications user_invitations password_reset_tokens user_mfa_methods user_registration_requests connector_secrets system_secrets; do printf 'sababuka.%s,' $t; done | sed 's/,$//') RESTART IDENTITY CASCADE" || exit 1
for t in $TABLES; do
  $REMOTE "psql -d sababuka -c '\\copy sababuka.$t TO STDOUT'" 2>/dev/null | $LOCAL -c "SET session_replication_role=replica" -c "\\copy sababuka.$t FROM STDIN" 2>&1 | head -2
  n=$($LOCAL -At -c "SELECT count(*) FROM sababuka.$t")
  echo "$t $n"
done
# pengguna: hanya id, email, username, status (email dianonimkan setelahnya)
$REMOTE "psql -d sababuka -c '\\copy (SELECT id,email,username,status FROM sababuka.users) TO STDOUT'" 2>/dev/null > /tmp/users_prod.tsv
$LOCAL -c "SET session_replication_role=replica" -c "CREATE TEMP TABLE u0(id uuid,email text,username text,status text)" -c "\\copy u0 FROM STDIN" -c "INSERT INTO sababuka.users(id,email,username,full_name,status,must_change_password) SELECT id,email,username,'Akun uji',status,false FROM u0" < /tmp/users_prod.tsv 2>&1 | head -3
echo "users $($LOCAL -At -c 'SELECT count(*) FROM sababuka.users')"
