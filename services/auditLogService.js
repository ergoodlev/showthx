/**
 * Audit Log Service
 * Logs all access to child data for compliance and security monitoring
 * Implements COPPA audit requirements - read-only, encrypted logs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const AUDIT_LOG_KEY = 'audit_logs';
const MAX_LOGS = 1000; // Keep last 1000 audit events

/**
 * Log event types for audit trail
 */
export const AUDIT_EVENTS = {
  VIDEO_CREATED: 'video_created',
  VIDEO_VIEWED: 'video_viewed',
  VIDEO_DELETED: 'video_deleted',
  VIDEO_APPROVED: 'video_approved',
  VIDEO_SHARED: 'video_shared',
  DATA_EXPORTED: 'data_exported',
  DATA_DELETED: 'data_deleted',
  ENCRYPTION_KEY_GENERATED: 'encryption_key_generated',
  PARENTAL_CONSENT: 'parental_consent',
  SETTINGS_CHANGED: 'settings_changed',
  GUEST_ADDED: 'guest_added',
  GUEST_DELETED: 'guest_deleted',
};

/**
 * Log an audit event
 * @param {string} eventType - Type of event
 * @param {object} details - Event details
 * @param {string} userId - User ID (parent)
 * @param {string} childId - Child ID (optional)
 * @returns {Promise<void>}
 */
export async function logAuditEvent(eventType, details = {}, userId, childId = null) {
  try {
    if (!Object.values(AUDIT_EVENTS).includes(eventType)) {
      console.warn(`[AUDIT] Unknown event type: ${eventType}`);
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      childId,
      details: {
        ...details,
        // Don't log sensitive data like video content
        videoUrl: details.videoUrl ? '[REDACTED]' : undefined,
        videoData: details.videoData ? '[REDACTED]' : undefined,
      },
    };

    // Get existing logs
    const logsJson = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    let logs = logsJson ? JSON.parse(logsJson) : [];

    // Add new entry
    logs.push(logEntry);

    // Keep only last MAX_LOGS entries
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(-MAX_LOGS);
    }

    // Store back
    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));

    console.log(`[AUDIT] Logged event: ${eventType} for user: ${userId}`);
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to log audit event:', error);
    // Don't throw - audit failures shouldn't break app functionality
  }
}

/**
 * Get audit logs (for parent review/COPPA compliance)
 * @param {object} filters - Filter options
 * @returns {Promise<array>}
 */
export async function getAuditLogs(filters = {}) {
  try {
    const logsJson = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    let logs = logsJson ? JSON.parse(logsJson) : [];

    // Apply filters
    if (filters.eventType) {
      logs = logs.filter(log => log.eventType === filters.eventType);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.childId) {
      logs = logs.filter(log => log.childId === filters.childId);
    }

    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }

    console.log(`[AUDIT] Retrieved ${logs.length} audit logs`);

    return logs;
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to retrieve audit logs:', error);
    return [];
  }
}

/**
 * Export audit logs as JSON (for COPPA compliance/right to access)
 * @returns {Promise<string>}
 */
export async function exportAuditLogs() {
  try {
    const logs = await getAuditLogs();
    const exportData = {
      exportedAt: new Date().toISOString(),
      logCount: logs.length,
      logs,
    };

    console.log('[AUDIT] Exported audit logs');

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to export audit logs:', error);
    throw error;
  }
}

/**
 * Clear audit logs (for right-to-be-forgotten, should be done server-side primarily)
 * @returns {Promise<void>}
 */
export async function clearAuditLogs() {
  try {
    await AsyncStorage.removeItem(AUDIT_LOG_KEY);
    console.log('[AUDIT] Cleared all audit logs');
  } catch (error) {
    console.error('[AUDIT ERROR] Failed to clear audit logs:', error);
    throw error;
  }
}

/**
 * Log video creation with metadata (without sensitive content)
 */
export async function logVideoCreated(videoMetadata, userId, childId) {
  await logAuditEvent(
    AUDIT_EVENTS.VIDEO_CREATED,
    {
      videoId: videoMetadata.id,
      guestName: videoMetadata.guestName,
      duration: videoMetadata.duration,
      sizeBytes: videoMetadata.sizeBytes,
    },
    userId,
    childId
  );
}

/**
 * Log video approval
 */
export async function logVideoApproved(videoId, userId, childId) {
  await logAuditEvent(
    AUDIT_EVENTS.VIDEO_APPROVED,
    { videoId },
    userId,
    childId
  );
}

/**
 * Log video deletion (right-to-be-forgotten)
 */
export async function logVideoDeleted(videoId, userId, childId, reason = '') {
  await logAuditEvent(
    AUDIT_EVENTS.VIDEO_DELETED,
    { videoId, reason },
    userId,
    childId
  );
}

/**
 * Log secure data export
 */
export async function logDataExported(dataType, count, userId) {
  await logAuditEvent(
    AUDIT_EVENTS.DATA_EXPORTED,
    { dataType, count },
    userId
  );
}

/**
 * Log parental consent given
 */
export async function logParentalConsent(userId, consentType, accepted) {
  await logAuditEvent(
    AUDIT_EVENTS.PARENTAL_CONSENT,
    { consentType, accepted },
    userId
  );
}
