#!/usr/bin/env ts-node
import { sql } from '@vercel/postgres';

async function migrate() {
  try {
    console.log('🚀 Starting V2 migration: TEXT to UUID for user IDs...');

    await sql.query(`
      -- Add pgcrypto extension for UUID generation
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Step 1: Add a temporary UUID column to users table
      ALTER TABLE users ADD COLUMN uuid_id UUID;

      -- Step 2: Generate UUIDs for existing users
      UPDATE users SET uuid_id = gen_random_uuid();

      -- Step 3: Set uuid_id as NOT NULL
      ALTER TABLE users ALTER COLUMN uuid_id SET NOT NULL;

      -- Step 4: Add a temporary UUID column to related tables
      ALTER TABLE groups ADD COLUMN created_by_uuid UUID;
      ALTER TABLE group_members ADD COLUMN user_id_uuid UUID;
      ALTER TABLE expenses ADD COLUMN paid_by_uuid UUID;
      ALTER TABLE expenses ADD COLUMN created_by_uuid UUID;

      -- Step 5: Update the foreign key columns with the new UUIDs
      UPDATE groups g SET created_by_uuid = u.uuid_id FROM users u WHERE g.created_by = u.id;
      UPDATE group_members gm SET user_id_uuid = u.uuid_id FROM users u WHERE gm.user_id = u.id;
      UPDATE expenses e SET paid_by_uuid = u.uuid_id FROM users u WHERE e.paid_by = u.id;
      UPDATE expenses e SET created_by_uuid = u.uuid_id FROM users u WHERE e.created_by = u.id;

      -- Step 6: Drop old foreign key constraints
      ALTER TABLE groups DROP CONSTRAINT groups_created_by_fkey;
      ALTER TABLE group_members DROP CONSTRAINT group_members_user_id_fkey;
      ALTER TABLE expenses DROP CONSTRAINT expenses_paid_by_fkey;
      ALTER TABLE expenses DROP CONSTRAINT expenses_created_by_fkey;

      -- Step 7: Drop old primary key and text-based columns
      -- First, drop the primary key constraint on users.id
      ALTER TABLE users DROP CONSTRAINT users_pkey;
      ALTER TABLE users DROP COLUMN id;
      ALTER TABLE groups DROP COLUMN created_by;
      ALTER TABLE group_members DROP COLUMN user_id;
      ALTER TABLE expenses DROP COLUMN paid_by;
      ALTER TABLE expenses DROP COLUMN created_by;

      -- Step 8: Rename the new UUID columns to their final names
      ALTER TABLE users RENAME COLUMN uuid_id TO id;
      ALTER TABLE groups RENAME COLUMN created_by_uuid TO created_by;
      ALTER TABLE group_members RENAME COLUMN user_id_uuid TO user_id;
      ALTER TABLE expenses RENAME COLUMN paid_by_uuid TO paid_by;
      ALTER TABLE expenses RENAME COLUMN created_by_uuid TO created_by;

      -- Step 9: Set the new primary key on users.id
      ALTER TABLE users ADD PRIMARY KEY (id);

      -- Step 10: Re-create foreign key constraints with the new UUID columns
      ALTER TABLE groups ADD FOREIGN KEY (created_by) REFERENCES users(id);
      ALTER TABLE group_members ADD FOREIGN KEY (user_id) REFERENCES users(id);
      ALTER TABLE expenses ADD FOREIGN KEY (paid_by) REFERENCES users(id);
      ALTER TABLE expenses ADD FOREIGN KEY (created_by) REFERENCES users(id);

      -- Step 11: Set NOT NULL constraints
      ALTER TABLE groups ALTER COLUMN created_by SET NOT NULL;
      ALTER TABLE group_members ALTER COLUMN user_id SET NOT NULL;
      ALTER TABLE expenses ALTER COLUMN paid_by SET NOT NULL;
      ALTER TABLE expenses ALTER COLUMN created_by SET NOT NULL;
    `);

    console.log('✅ V2 migration completed successfully!');
  } catch (error) {
    console.error('❌ V2 migration failed:', error);
    process.exit(1);
  }
}

migrate().then(() => {
  console.log('✨ Done!');
  process.exit(0);
});
