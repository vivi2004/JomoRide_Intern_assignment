import {
  getPendingActions,
  updateActionStatus,
} from '../database/dutyQueue';

let isSyncing = false;

/**
 * Simulates sending a queued action to a server.
 * No backend is required for this assignment.
 */
async function executeDutyAction(actionId: number): Promise<void> {
  // Simulate asynchronous network work without blocking the UI.
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 500);
  });

  console.log(`[JomoRide] Executed START_DUTY action: ${actionId}`);
}

/**
 * Process queued actions when the device is online.
 * Prevents concurrent synchronization runs.
 */
export async function syncPendingDutyActions(): Promise<void> {
  if (isSyncing) {
    return;
  }

  isSyncing = true;

  try {
    const pendingActions = await getPendingActions();

    for (const action of pendingActions) {
      await updateActionStatus(action.id, 'processing');

      try {
        await executeDutyAction(action.id);
        await updateActionStatus(action.id, 'completed');
      } catch (error) {
        console.error(
          `[JomoRide] Failed to execute action ${action.id}:`,
          error,
        );

        await updateActionStatus(action.id, 'pending');
      }
    }
  } catch (error) {
    console.error('[JomoRide] Queue synchronization failed:', error);
  } finally {
    isSyncing = false;
  }
}



 