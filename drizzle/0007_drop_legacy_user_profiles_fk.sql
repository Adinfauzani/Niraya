-- 0007_drop_legacy_user_profiles_fk.sql
--
-- Hapus FK legacy `core."UserProfiles"."Id"` -> `auth.users(id)`.
--
-- Identitas aplikasi sekarang dikelola Better Auth (`core."AuthUser"`), bukan
-- Supabase Auth. Baris Better Auth tidak ada di `auth.users`, sehingga FK ini
-- membuat insert profil gagal dengan SQLSTATE 23503 untuk setiap pengguna baru.
-- `ensureUserProfile()` menelan error tersebut dan mengembalikan null, sehingga
-- pengguna baru tidak pernah mendapat baris profil (role fallback `user`).
--
-- Constraint tidak ada di baseline `drizzle/schema/core.sql` maupun migrasi
-- 0001-0006, jadi ini hanya membersihkan DB lama. Idempoten.
--
-- Apply manual pada dev branch; `bun db:migrate` tidak akan me-replay file ini
-- karena `drizzle/meta/_journal.json` hanya mengenal 0000.

ALTER TABLE "core"."UserProfiles"
    DROP CONSTRAINT IF EXISTS "UserProfiles_Id_fkey";