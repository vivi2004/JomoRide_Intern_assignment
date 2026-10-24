import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

import {
  enqueueDutyAction,
  getPendingActionCount,
  recoverInterruptedActions,
} from '../database/dutyQueue';

import { syncPendingDutyActions } from '../services/dutySyncService';

type DutyStatus = 'idle' | 'queued' | 'syncing' | 'success' | 'error';
type NetworkStatus = 'checking' | 'online' | 'offline';

function isNetworkAvailable(state: NetInfoState): boolean {
  return (
    state.isConnected !== false &&
    state.isInternetReachable !== false &&
    (state.isConnected === true || state.isInternetReachable === true)
  );
}

function getInitialAppState(): AppStateStatus {
  switch (AppState.currentState) {
    case 'active':
    case 'background':
    case 'inactive':
    case 'extension':
    case 'unknown':
      return AppState.currentState;
    default:
      return 'active';
  }
}

export function useDutyQueue() {
  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>('checking');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  const mountedRef = useRef(false);
  const onlineRef = useRef(false);
  const actionRequestedRef = useRef(false);
  const operationRef = useRef(false);
  const synchronizeQueueRef = useRef<(() => Promise<void>) | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingActionCount();

      if (mountedRef.current) {
        setPendingCount(count);
      }

      return count;
    } catch (error) {
      console.error('[JomoRide] Failed to read queue:', error);
      return null;
    }
  }, []);

  const synchronizeQueue = useCallback(async () => {
    if (!onlineRef.current || operationRef.current) {
      return;
    }

    operationRef.current = true;

    try {
      const pendingBeforeSync = await refreshPendingCount();

      if (pendingBeforeSync === null) {
        if (mountedRef.current) {
          setDutyStatus('error');
        }
        return;
      }

      if (pendingBeforeSync === 0) {
        if (mountedRef.current) {
          setDutyStatus('idle');
        }
        return;
      }

      if (mountedRef.current) {
        setDutyStatus('syncing');
      }

      await syncPendingDutyActions();
      const remaining = await refreshPendingCount();

      if (!mountedRef.current) {
        return;
      }

      if (remaining === null) {
        setDutyStatus('error');
        return;
      }

      // Do not report success if connectivity dropped during processing.
      if (!onlineRef.current) {
        setDutyStatus(remaining > 0 ? 'queued' : 'idle');
        return;
      }

      if (remaining > 0) {
        setDutyStatus('queued');
      } else if (pendingBeforeSync > 0 || actionRequestedRef.current) {
        setDutyStatus('success');
        actionRequestedRef.current = false;
      } else {
        setDutyStatus('idle');
      }
    } catch (error) {
      console.error('[JomoRide] Synchronization failed:', error);

      if (mountedRef.current) {
        setDutyStatus('error');
      }
    } finally {
      operationRef.current = false;

      // Retry if connectivity returned while another operation held the lock.
      if (onlineRef.current && mountedRef.current) {
        void refreshPendingCount().then((count) => {
          if (count !== null && count > 0 && mountedRef.current) {
            void synchronizeQueueRef.current?.();
          }
        });
      }
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    synchronizeQueueRef.current = synchronizeQueue;
  }, [synchronizeQueue]);

  const handleStartDuty = useCallback(async () => {
    if (operationRef.current) {
      return;
    }

    operationRef.current = true;
    let shouldSynchronize = false;

    try {
      const state = await NetInfo.refresh();
      const online = isNetworkAvailable(state);

      console.log('[JomoRide] NetInfo fetch on Start Duty:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        computedOnline: online,
      });

      onlineRef.current = online;

      if (mountedRef.current) {
        setNetworkStatus(online ? 'online' : 'offline');
      }

      // Persist first so connectivity changes cannot lose the driver's action.
      await enqueueDutyAction();
      actionRequestedRef.current = true;

      const count = await refreshPendingCount();

      if (count === null) {
        setDutyStatus('error');
        return;
      }

      if (!online) {
        setDutyStatus('queued');
        return;
      }

      setDutyStatus('syncing');
      shouldSynchronize = true;
    } catch (error) {
      console.error('[JomoRide] Could not save Start Duty:', error);

      if (mountedRef.current) {
        setDutyStatus('error');
      }
    } finally {
      operationRef.current = false;
    }

    if (shouldSynchronize && onlineRef.current) {
      await synchronizeQueue();
    }
  }, [refreshPendingCount, synchronizeQueue]);

  useEffect(() => {
    mountedRef.current = true;
    let appState: AppStateStatus = getInitialAppState();

    if (Platform.OS === 'ios') {
      NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityMethod: 'HEAD',
        reachabilityTest: (response) =>
          Promise.resolve(response.status === 204),
        reachabilityRequestTimeout: 5000,
        useNativeReachability: false,
      });
    }

    const initialize = async () => {
      try {
        await recoverInterruptedActions();

        const initialPendingCount = await refreshPendingCount();

        if (
          mountedRef.current &&
          initialPendingCount !== null &&
          initialPendingCount > 0
        ) {
          setDutyStatus('queued');
        }

        const state = await NetInfo.refresh();
        const online = isNetworkAvailable(state);

        console.log('[JomoRide] Initial NetInfo state:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          computedOnline: online,
        });

        onlineRef.current = online;

        if (mountedRef.current) {
          setNetworkStatus(online ? 'online' : 'offline');
        }

        if (online) {
          const count = await refreshPendingCount();

          if (count !== null && count > 0) {
            await synchronizeQueue();
          }
        }
      } catch (error) {
        console.error('[JomoRide] Initialization failed:', error);
      }
    };

    void initialize();

    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      void (async () => {
        const online = isNetworkAvailable(state);

        console.log('[JomoRide] NetInfo update:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          computedOnline: online,
        });

        onlineRef.current = online;

        if (mountedRef.current) {
          setNetworkStatus(online ? 'online' : 'offline');
        }

        if (online) {
          void synchronizeQueue();
        }
      })();
    });

    const reconnectInterval = setInterval(() => {
      void (async () => {
        try {
          const state = await NetInfo.refresh();
          const online = isNetworkAvailable(state);

          onlineRef.current = online;

          if (mountedRef.current) {
            setNetworkStatus(online ? 'online' : 'offline');
          }

          if (online) {
            const count = await refreshPendingCount();

            if (count !== null && count > 0) {
              await synchronizeQueue();
            }
          }
        } catch (error) {
          console.error(
            '[JomoRide] Failed to refresh network state:',
            error,
          );
        }
      })();
    }, 3000);

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        const wasBackgrounded =
          appState === 'background' || appState === 'inactive';

        appState = nextState;

        if (wasBackgrounded && nextState === 'active') {
          void (async () => {
            try {
              const state = await NetInfo.refresh();
              const online = isNetworkAvailable(state);

              console.log('[JomoRide] NetInfo state on resume:', {
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                computedOnline: online,
              });

              onlineRef.current = online;

              if (mountedRef.current) {
                setNetworkStatus(online ? 'online' : 'offline');
              }

              const resumedPendingCount = await refreshPendingCount();

              if (
                mountedRef.current &&
                resumedPendingCount !== null &&
                resumedPendingCount > 0
              ) {
                setDutyStatus('queued');
              }

              if (online) {
                await synchronizeQueue();
              }
            } catch (error) {
              console.error('[JomoRide] Failed to resume queue:', error);
            }
          })();
        }
      },
    );

    return () => {
      mountedRef.current = false;
      unsubscribeNetwork();
      clearInterval(reconnectInterval);
      appStateSubscription.remove();
    };
  }, [refreshPendingCount, synchronizeQueue]);

  const message =
    dutyStatus === 'success'
      ? 'Duty Started Successfully'
      : dutyStatus === 'queued'
        ? 'Saved offline, waiting for network...'
        : dutyStatus === 'syncing'
          ? 'Synchronizing duty action...'
          : dutyStatus === 'error'
            ? 'Unable to process duty action. Please try again.'
            : networkStatus === 'checking'
              ? 'Checking your network connection...'
              : networkStatus === 'offline'
                ? 'You are offline. Ready to save actions locally.'
                : 'Your device is connected and ready.';

  return {
    networkStatus,
    dutyStatus,
    pendingCount,
    message,
    handleStartDuty,
  };
}