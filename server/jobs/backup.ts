import { repository } from "../db/repository.js";

/**
 * Creates a timestamped backup of the database file.
 * Returns the absolute path of the backup file created.
 */
export async function runBackup(): Promise<string> {
  return repository.runBackup();
}
