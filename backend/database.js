const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, 'crm.db');

class PgWrapper {
  constructor(connectionString) {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  convertSql(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }

  async get(sql, params = []) {
    const pgSql = this.convertSql(sql);
    const res = await this.pool.query(pgSql, params);
    return res.rows[0] || null;
  }

  async all(sql, params = []) {
    const pgSql = this.convertSql(sql);
    const res = await this.pool.query(pgSql, params);
    return res.rows;
  }

  async run(sql, params = []) {
    let pgSql = this.convertSql(sql);
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert) {
      pgSql += ' RETURNING id';
    }
    const res = await this.pool.query(pgSql, params);
    return {
      lastID: isInsert && res.rows[0] ? res.rows[0].id : null,
      changes: res.rowCount
    };
  }

  async exec(sql) {
    await this.pool.query(sql);
  }
}

async function initDB() {
  if (process.env.DATABASE_URL) {
    console.log("Connecting to PostgreSQL (Neon)...");
    let connectionString = process.env.DATABASE_URL.trim();
    if (connectionString.startsWith('"') && connectionString.endsWith('"')) {
      connectionString = connectionString.slice(1, -1);
    } else if (connectionString.startsWith("'") && connectionString.endsWith("'")) {
      connectionString = connectionString.slice(1, -1);
    }

    try {
      const db = new PgWrapper(connectionString);
      
      // Initialize PostgreSQL schemas
      await db.exec(`
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
      
      console.log("PostgreSQL schema ensured successfully.");
      return db;
    } catch (err) {
      console.error("FATAL: Failed to connect to PostgreSQL or initialize schema:", err.message);
      throw err;
    }
  }

  console.log("Connecting to local SQLite database...");
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
