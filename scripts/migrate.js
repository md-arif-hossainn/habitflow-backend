const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
    console.error('❌  Set DATABASE_URL in your environment first.');
    console.error('    Example: DATABASE_URL=postgresql://postgres:YOUR_PASS@db.rjptlbxxufxhxqbkfljz.supabase.co:5432/postgres node scripts/migrate.js');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅  Connected to Supabase PostgreSQL');

    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/001_initial.sql'),
      'utf8',
    );

    await client.query(sql);
    console.log('✅  Migration 001_initial.sql applied successfully');
    console.log('    Tables created: habits, habit_completions, fcm_tokens');
    console.log('    RLS policies: enabled on all tables');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️   Migration already applied — tables already exist, skipping.');
    } else {
      console.error('❌  Migration failed:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runMigration();
