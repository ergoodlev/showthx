/**
 * Remote Logger - Send console logs to view them remotely
 * Also integrates with Sentry for error tracking
 */

import * as Sentry from '@sentry/react-native';

const LOGS = [];
const MAX_LOGS = 500;

// Override console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

export const initRemoteLogger = () => {
  console.log = (...args) => {
    const message = args.join(' ');
    LOGS.push({ type: 'log', time: new Date().toISOString(), message });
    if (LOGS.length > MAX_LOGS) LOGS.shift();

    // Send to Sentry as breadcrumb (helps with debugging context)
    Sentry.addBreadcrumb({
      category: 'console',
      message: message,
      level: 'info',
    });

    originalConsoleLog(...args);
  };

  console.error = (...args) => {
    const message = args.join(' ');
    LOGS.push({ type: 'error', time: new Date().toISOString(), message });
    if (LOGS.length > MAX_LOGS) LOGS.shift();

    // Send errors to Sentry
    Sentry.captureException(new Error(message), {
      level: 'error',
      tags: { source: 'console.error' },
    });

    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    const message = args.join(' ');
    LOGS.push({ type: 'warn', time: new Date().toISOString(), message });
    if (LOGS.length > MAX_LOGS) LOGS.shift();

    // Send warnings to Sentry as breadcrumbs
    Sentry.addBreadcrumb({
      category: 'console',
      message: message,
      level: 'warning',
    });

    originalConsoleWarn(...args);
  };
};

export const getLogs = () => LOGS;

export const clearLogs = () => {
  LOGS.length = 0;
};

export const exportLogsAsText = () => {
  return LOGS.map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
};
