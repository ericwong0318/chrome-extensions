import { useEffect, useState } from 'react';
import { getLogs, clearLogs, LogEntry } from '../utils';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      getLogs().then(setLogs);
    }
  }, []);

  const refreshLogs = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      getLogs().then(setLogs);
    }
  };

  const clearLog = () => {
    clearLogs().then(() => setLogs([]));
  };

  return { logs, refreshLogs, clearLog };
};