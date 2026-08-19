import * as SQLite from "expo-sqlite";
import { DatabaseError } from "@/src/core/errors/AppError";
import { runMigrations } from "@/src/data/database/migrations/MigrationRunner";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) databasePromise = initializeDatabase();
  try { return await databasePromise; } catch (error) { databasePromise = null; throw error; }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    const database = await SQLite.openDatabaseAsync("kindle-reader.db");
    await database.execAsync("PRAGMA journal_mode = WAL;");
    await runMigrations(database);
    return database;
  } catch (error) {
    throw new DatabaseError("Não foi possível inicializar a biblioteca local.", error);
  }
}
