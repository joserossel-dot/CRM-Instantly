const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { Client } = require('pg');
const path = require('path');

const sqliteDbPath = path.resolve(__dirname, '../crm.db');
const pgConnectionString = process.env.DATABASE_URL;
if (!pgConnectionString) {
  console.error('Error: Please provide DATABASE_URL environment variable.');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to local SQLite database...');
  const sqliteDb = await open({
    filename: sqliteDbPath,
    driver: sqlite3.Database
  });

  console.log('Connecting to remote PostgreSQL database...');
  const pgClient = new Client({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log('Reading data from SQLite...');
  const leads = await sqliteDb.all('SELECT * FROM leads');
  const tasks = await sqliteDb.all('SELECT * FROM tasks');
  const messages = await sqliteDb.all('SELECT * FROM messages');

  console.log(`Found in SQLite: ${leads.length} leads, ${tasks.length} tasks, ${messages.length} messages.`);

  // Ensure tables exist
  console.log('Ensuring database schema exists...');
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      email TEXT,
      name TEXT,
      company TEXT,
      phone TEXT,
      job_title TEXT,
      message TEXT,
      status TEXT DEFAULT 'Nuevo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      due_date TIMESTAMP,
      task_type TEXT DEFAULT 'general',
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      direction TEXT DEFAULT 'inbound',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clear remote tables just in case we are doing a clean sync
  console.log('Clearing remote database tables...');
  await pgClient.query('TRUNCATE TABLE messages, tasks, leads CASCADE');

  console.log('Migrating leads...');
  for (const lead of leads) {
    await pgClient.query(
      'INSERT INTO leads (id, email, name, company, phone, job_title, message, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [lead.id, lead.email, lead.name, lead.company, lead.phone, lead.job_title, lead.message, lead.status, lead.created_at]
    );
  }

  console.log('Migrating tasks...');
  for (const task of tasks) {
    await pgClient.query(
      'INSERT INTO tasks (id, lead_id, description, completed, due_date, task_type, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [task.id, task.lead_id, task.description, task.completed, task.due_date, task.task_type, task.metadata, task.created_at]
    );
  }

  console.log('Migrating messages...');
  for (const msg of messages) {
    await pgClient.query(
      'INSERT INTO messages (id, lead_id, body, direction, created_at) VALUES ($1, $2, $3, $4, $5)',
      [msg.id, msg.lead_id, msg.body, msg.direction, msg.created_at]
    );
  }

  // Reset serial sequences
  console.log('Resetting serial sequences...');
  await pgClient.query("SELECT setval(pg_get_serial_sequence('leads', 'id'), coalesce(max(id), 1)) FROM (SELECT id FROM leads) x");
  await pgClient.query("SELECT setval(pg_get_serial_sequence('tasks', 'id'), coalesce(max(id), 1)) FROM (SELECT id FROM tasks) x");
  await pgClient.query("SELECT setval(pg_get_serial_sequence('messages', 'id'), coalesce(max(id), 1)) FROM (SELECT id FROM messages) x");

  console.log('Migration completed successfully!');
  await sqliteDb.close();
  await pgClient.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
});
