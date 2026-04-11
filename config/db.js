const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ecommerce.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * MySQL-compatible wrapper around better-sqlite3
 * This lets all controllers use the same `pool.execute(sql, params)` pattern
 * without needing to rewrite every query call.
 */
const pool = {
  execute(sql, params = []) {
    const trimmed = sql.trim().toUpperCase();
    const stmt = db.prepare(sql);

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.startsWith('PRAGMA')) {
      const rows = stmt.all(...params);
      return [rows];
    } else {
      const result = stmt.run(...params);
      return [{ affectedRows: result.changes, insertId: result.lastInsertRowid }];
    }
  },

  getConnection() {
    // Simulates a MySQL connection with transaction support
    return {
      execute(sql, params = []) {
        return pool.execute(sql, params);
      },
      beginTransaction() {
        db.exec('BEGIN TRANSACTION');
      },
      commit() {
        db.exec('COMMIT');
      },
      rollback() {
        try { db.exec('ROLLBACK'); } catch (e) { /* already rolled back */ }
      },
      release() {
        // no-op for SQLite
      }
    };
  }
};

function testConnection() {
  try {
    db.prepare('SELECT 1').get();
    console.log('✅ SQLite Database connected successfully');
    console.log(`   Database file: ${DB_PATH}`);
  } catch (error) {
    console.error('❌ SQLite connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { db, pool, testConnection };
