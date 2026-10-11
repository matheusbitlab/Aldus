import { Platform } from 'react-native';
import { getDatabase } from '@/src/data/database/connection/database';
import { webGetPersistent, webMutatePersistent } from '@/src/data/database/connection/webLibraryStore';
import { emptySyncState, LibrarySyncPersistence, LibrarySyncState } from '@/src/domain/types/librarySync';
export class DurableLibrarySyncPersistence implements LibrarySyncPersistence {
  async read(owner: string): Promise<LibrarySyncState> {
    if (Platform.OS === 'web') return await webGetPersistent<LibrarySyncState>('library_sync_state', owner) ?? emptySyncState(owner);
    const db = await getDatabase(); const row = await db.getFirstAsync<{ state_json: string }>('SELECT state_json FROM library_sync_state WHERE user_id=?', owner);
    return row ? JSON.parse(row.state_json) : emptySyncState(owner);
  }
  async mutate(owner: string, change: (state: LibrarySyncState) => void): Promise<void> {
    if (Platform.OS === 'web') {
      await webMutatePersistent<LibrarySyncState>('library_sync_state', owner, value => {
        const state = value ?? emptySyncState(owner); change(state); return state;
      }); return;
    }
    const db = await getDatabase();
    await db.withExclusiveTransactionAsync(async transaction => {
      const row = await transaction.getFirstAsync<{ state_json: string }>('SELECT state_json FROM library_sync_state WHERE user_id=?', owner);
      const state: LibrarySyncState = row ? JSON.parse(row.state_json) : emptySyncState(owner);
      change(state);
      await transaction.runAsync('INSERT INTO library_sync_state(user_id,state_json) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json', owner, JSON.stringify(state));
    });
  }
}
