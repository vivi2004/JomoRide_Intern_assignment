import * as SQLite from 'expo-sqlite';

export type DutyAction = {
  id: number;
  action: string;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('jomoride.db');
  }

  const db = await databasePromise;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS duty_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

/**
 * Save an action locally so it survives app restarts.
 */
export async function enqueueDutyAction(): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO duty_actions (action, status, created_at)
     VALUES (?, 'pending', ?)`,
    'START_DUTY',
    new Date().toISOString(),
  );

  return result.lastInsertRowId;
}

/**
 * Retrieve actions waiting to be synchronized.
 */
export async function getPendingActions(): Promise<DutyAction[]> {
  const db = await getDatabase();

  return db.getAllAsync<DutyAction>(
    `SELECT
       id,
       action,
       status,
       created_at AS createdAt
     FROM duty_actions
     WHERE status = 'pending'
     ORDER BY id ASC`,
  );
}

/**
 * Update an action's synchronization status.
 */
export async function updateActionStatus(
  id: number,
  status: DutyAction['status'],
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE duty_actions SET status = ? WHERE id = ?',
    status,
    id,
  );
}

/**
 * Recover actions interrupted by an app restart.
 */
export async function recoverInterruptedActions(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE duty_actions
     SET status = 'pending'
     WHERE status = 'processing'`,
  );
}

/**
 * Count actions that are still waiting to be synchronized.
 */
export async function getPendingActionCount(): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM duty_actions
     WHERE status IN ('pending', 'processing')`,
  );

  return result?.count ?? 0;
}
