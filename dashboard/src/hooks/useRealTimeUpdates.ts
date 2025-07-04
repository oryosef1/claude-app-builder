import { useEffect } from 'react';
import { apiService } from '../services/api';
import useWorkflowStore from '../stores/workflowStore';

export const useRealTimeUpdates = () => {
  const { addLog, setStatus } = useWorkflowStore();

  useEffect(() => {
    // Subscribe to real-time log updates
    const unsubscribeLogs = apiService.subscribeToLogs((log) => {
      addLog(log);
    });

    // Subscribe to workflow status updates
    const unsubscribeStatus = apiService.subscribeToWorkflowStatus((status) => {
      setStatus(status.status);
    });

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeLogs();
      unsubscribeStatus();
    };
  }, [addLog, setStatus]);
};

export default useRealTimeUpdates;