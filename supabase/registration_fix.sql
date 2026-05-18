-- Run this in Supabase SQL Editor after the existing schema and seed data are loaded.
-- It does not recreate any tables.

CREATE POLICY "person_insert_own" ON person
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "app_user_insert_own" ON app_user
  FOR INSERT TO authenticated
  WITH CHECK (
    person_id = (
      SELECT person_id FROM person
      WHERE email = auth.jwt()->>'email'
    )
  );
