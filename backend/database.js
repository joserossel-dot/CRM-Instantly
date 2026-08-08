const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = process.env.RENDER ? '/data/crm.db' : path.resolve(__dirname, 'crm.db');

async function initDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      name TEXT,
      company TEXT,
      phone TEXT,
      job_title TEXT,
      message TEXT,
      status TEXT DEFAULT 'Nuevo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      due_date DATETIME,
      task_type TEXT DEFAULT 'general',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      direction TEXT DEFAULT 'inbound',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads (id) ON DELETE CASCADE
    );
  `);

  // Try adding columns in case the table already exists
  try { await db.exec("ALTER TABLE tasks ADD COLUMN due_date DATETIME;"); } catch (e) {}
  try { await db.exec("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'general';"); } catch (e) {}
  try { await db.exec("ALTER TABLE tasks ADD COLUMN metadata TEXT;"); } catch (e) {}
  try { await db.exec("ALTER TABLE leads ADD COLUMN phone TEXT;"); } catch (e) {}
  try { await db.exec("ALTER TABLE leads ADD COLUMN job_title TEXT;"); } catch (e) {}

  // Migrate existing messages from leads table to messages table
  try {
    const existingLeads = await db.all("SELECT id, message, created_at FROM leads WHERE message IS NOT NULL AND message != ''");
    for (const lead of existingLeads) {
      // Check if this lead already has this message in messages table (avoid duplicate on restart)
      const existingMsg = await db.get("SELECT id FROM messages WHERE lead_id = ? AND body = ?", [lead.id, lead.message]);
      if (!existingMsg) {
        await db.run("INSERT INTO messages (lead_id, body, created_at, direction) VALUES (?, ?, ?, 'inbound')", [lead.id, lead.message, lead.created_at]);
      }
    }
  } catch(e) {
    console.error("Migration error:", e);
  }

  return db;
}

const dbPromise = initDB();

module.exports = dbPromise;
