/**
 * DebugLogsScreen - View console logs in the app
 * Access by adding a debug button in parent dashboard
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEdition } from '../context/EditionContext';
import { AppBar } from '../components/AppBar';
import { getLogs, clearLogs, exportLogsAsText } from '../services/remoteLogger';

export const DebugLogsScreen = ({ navigation }) => {
  const { theme } = useEdition();
  const [logs, setLogs] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const interval = autoRefresh ? setInterval(() => {
      setLogs([...getLogs()]);
    }, 1000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    setLogs([...getLogs()]);
  }, []);

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
  };

  const handleShareLogs = async () => {
    try {
      const logsText = exportLogsAsText();
      await Share.share({
        message: logsText,
        title: 'App Logs',
      });
    } catch (error) {
      console.error('Error sharing logs:', error);
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#DC2626';
      case 'warn': return '#F59E0B';
      default: return theme.neutralColors.dark;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.neutralColors.white }}>
      <AppBar
        title="Debug Logs"
        onBackPress={() => navigation?.goBack()}
        showBack={true}
      />

      {/* Controls */}
      <View style={{
        flexDirection: 'row',
        padding: 12,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.neutralColors.lightGray,
      }}>
        <TouchableOpacity
          onPress={() => setAutoRefresh(!autoRefresh)}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: autoRefresh ? theme.brandColors.teal : theme.neutralColors.lightGray,
            borderRadius: 8,
          }}
        >
          <Ionicons
            name={autoRefresh ? 'refresh' : 'pause'}
            size={16}
            color={autoRefresh ? '#FFF' : theme.neutralColors.mediumGray}
          />
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: autoRefresh ? '#FFF' : theme.neutralColors.mediumGray,
          }}>
            {autoRefresh ? 'Auto' : 'Paused'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareLogs}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: theme.brandColors.coral,
            borderRadius: 8,
          }}
        >
          <Ionicons name="share-outline" size={16} color="#FFF" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>
            Share
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClearLogs}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: theme.neutralColors.lightGray,
            borderRadius: 8,
          }}
        >
          <Ionicons name="trash-outline" size={16} color={theme.neutralColors.mediumGray} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.neutralColors.mediumGray }}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>

      {/* Log count */}
      <View style={{ padding: 8, backgroundColor: theme.neutralColors.lightGray }}>
        <Text style={{ fontSize: 11, color: theme.neutralColors.mediumGray, textAlign: 'center' }}>
          {logs.length} log{logs.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Logs */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        ref={(ref) => ref?.scrollToEnd({ animated: true })}
      >
        {logs.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color={theme.neutralColors.lightGray} />
            <Text style={{
              marginTop: 12,
              fontSize: 14,
              color: theme.neutralColors.mediumGray,
              textAlign: 'center',
            }}>
              No logs yet. Logs will appear here as you use the app.
            </Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View
              key={index}
              style={{
                marginBottom: 8,
                padding: 8,
                backgroundColor: log.type === 'error' ? 'rgba(220, 38, 38, 0.05)' :
                  log.type === 'warn' ? 'rgba(245, 158, 11, 0.05)' :
                  theme.neutralColors.lightGray,
                borderRadius: 6,
                borderLeftWidth: 3,
                borderLeftColor: getLogColor(log.type),
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: getLogColor(log.type),
                  textTransform: 'uppercase',
                }}>
                  {log.type}
                </Text>
                <Text style={{ fontSize: 9, color: theme.neutralColors.mediumGray }}>
                  {new Date(log.time).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={{
                fontSize: 11,
                fontFamily: 'Courier',
                color: theme.neutralColors.dark,
              }}>
                {log.message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DebugLogsScreen;
