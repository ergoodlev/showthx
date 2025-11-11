/**
 * Parent Dashboard Screen
 * Manage videos, approve/reject, send to recipients
 * View audit logs and manage settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getParentEmail } from '../services/secureStorageService';
import { sendVideoShareEmail } from '../services/emailService';
import { logoutParent } from '../services/sessionService';

export default function ParentDashboardScreen({
  guests = [],
  pendingVideos = [],
  draftVideos = [],
  approvedVideos = [],
  onApproveVideo,
  onRejectVideo,
  onLogout,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('pending'); // pending, approved, settings
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    loadParentEmail();
    loadAuditLogs();
  }, []);

  const loadParentEmail = async () => {
    const email = await getParentEmail();
    setParentEmail(email || 'parent@example.com');
  };

  const loadAuditLogs = () => {
    // TODO: Fetch from auditLogService
    // For now, mock data
    setAuditLogs([
      {
        id: '1',
        event: 'video_created',
        child: 'Emma',
        guest: 'Grandma',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: '2',
        event: 'video_approved',
        child: 'Emma',
        guest: 'Uncle Bob',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ]);
  };

  const handleApproveVideo = async (video) => {
    Alert.alert('Approve Video?', `Approve thank you from ${video.guestName}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          setLoading(true);
          try {
            if (onApproveVideo) {
              await onApproveVideo(video.id);
            }
            Alert.alert('Success', 'Video approved');
            setShowVideoModal(false);
            setSelectedVideo(null);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleRejectVideo = (video) => {
    Alert.alert('Reject Video?', 'Are you sure? This will delete the draft.', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            if (onRejectVideo) {
              await onRejectVideo(video.id);
            }
            Alert.alert('Deleted', 'Video has been deleted');
            setShowVideoModal(false);
            setSelectedVideo(null);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleSendVideo = async () => {
    if (!sendEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await sendVideoShareEmail(
        {
          id: selectedVideo.id,
          userId: 'parent_id',
          giftName: selectedVideo.giftName,
        },
        sendEmail,
        'Parent',
        'Child'
      );

      Alert.alert('Success', `Video link sent to ${sendEmail}`);
      setSendEmail('');
      setShowSendModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to send video');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out?', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutParent();
            if (onLogout) {
              onLogout();
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const renderPendingVideos = () => {
    // Combine guest videos with draft videos
    let videosToShow = [...(draftVideos || [])];

    // Add completed guest videos (recorded videos)
    if (guests && guests.length > 0) {
      const guestVideos = guests
        .filter(g => g.completed && g.video) // Only show recorded videos
        .map(g => ({
          id: g.id,
          guestName: g.name,
          guest_name: g.name,
          gift: g.gift,
          giftName: g.gift,
          video: g.video,
          video_url: g.video_url || g.video,
          approved: g.approved || false,
          sent: g.sent || false,
          recordedAt: g.recorded_at,
          email: g.email,
          video_type: 'thank_you',
        }));
      videosToShow = [...videosToShow, ...guestVideos];
    }

    if (!videosToShow || videosToShow.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Pending Videos</Text>
          <Text style={styles.emptyText}>
            All videos have been reviewed. Nice work!
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={videosToShow}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const isGiftOpening = item.video_type === 'gift_opening';
          const displayTitle = isGiftOpening
            ? `${item.guest_name || item.guestName} - Gift Opening`
            : item.guest_name || item.guestName;
          const displaySubtitle = isGiftOpening
            ? `Gift: ${item.gift || item.giftName}`
            : `Gift: ${item.gift || item.giftName}`;

          return (
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => {
                setSelectedVideo(item);
                setShowVideoModal(true);
              }}
            >
              <View style={styles.videoThumbnail}>
                <Ionicons
                  name={isGiftOpening ? "gift" : "play-circle"}
                  size={40}
                  color="white"
                />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{displayTitle}</Text>
                <Text style={styles.videoSubtitle}>{displaySubtitle}</Text>
                <Text style={styles.videoTime}>
                  {item.recordedAt ? new Date(item.recordedAt).toLocaleDateString() : 'Today'}
                </Text>
                {isGiftOpening && (
                  <Text style={styles.videoType}>Gift Opening Video</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  const renderSettings = () => {
    return (
      <ScrollView style={styles.settingsContainer}>
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="mail" size={20} color="#14B8A6" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Parent Email</Text>
                <Text style={styles.settingValue}>{parentEmail}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Video Retention</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="trash" size={20} color="#14B8A6" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Draft Videos</Text>
                <Text style={styles.settingValue}>Delete after 7 days</Text>
              </View>
            </View>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="calendar" size={20} color="#14B8A6" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Approved Videos</Text>
                <Text style={styles.settingValue}>Keep for 90 days</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="lock-closed" size={20} color="#14B8A6" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Encryption</Text>
                <Text style={styles.settingValue}>Optional E2E enabled</Text>
              </View>
            </View>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <Ionicons name="eye" size={20} color="#14B8A6" />
              <View style={styles.settingText}>
                <Text style={styles.settingName}>Audit Logs</Text>
                <Text style={styles.settingValue}>All actions tracked</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderAuditLogs = () => {
    return (
      <FlatList
        data={auditLogs}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.logItem}>
            <View style={styles.logIcon}>
              <Ionicons
                name={
                  item.event === 'video_created'
                    ? 'camera'
                    : 'checkmark-circle'
                }
                size={20}
                color="#14B8A6"
              />
            </View>
            <View style={styles.logContent}>
              <Text style={styles.logTitle}>
                {item.event === 'video_created'
                  ? 'Video Recorded'
                  : 'Video Approved'}
              </Text>
              <Text style={styles.logDescription}>
                {item.child} thanking {item.guest}
              </Text>
              <Text style={styles.logTime}>
                {item.timestamp.toLocaleDateString()} at{' '}
                {item.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
        >
          <Ionicons name="chevron-back" size={28} color="#14B8A6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Ionicons
          name="person-circle"
          size={40}
          color="#14B8A6"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons
            name="eye"
            size={20}
            color={activeTab === 'pending' ? '#14B8A6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' && styles.activeTabText,
            ]}
          >
            Pending ({pendingVideos?.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
          onPress={() => setActiveTab('logs')}
        >
          <Ionicons
            name="document-text"
            size={20}
            color={activeTab === 'logs' ? '#14B8A6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'logs' && styles.activeTabText,
            ]}
          >
            Audit Log
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name="settings"
            size={20}
            color={activeTab === 'settings' ? '#14B8A6' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'settings' && styles.activeTabText,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'pending' && renderPendingVideos()}
        {activeTab === 'logs' && renderAuditLogs()}
        {activeTab === 'settings' && renderSettings()}
      </ScrollView>

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVideoModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVideoModal(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review Video</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedVideo && (
            <ScrollView style={styles.modalContent}>
              {/* Video Player Placeholder */}
              <View style={styles.videoPlayer}>
                <Ionicons name="play-circle" size={80} color="#14B8A6" />
                <Text style={styles.videoPlayerText}>
                  Video Preview: {selectedVideo.guestName}
                </Text>
              </View>

              {/* Video Details */}
              <View style={styles.detailsBox}>
                <Text style={styles.detailLabel}>From:</Text>
                <Text style={styles.detailValue}>{selectedVideo.guestName}</Text>

                <Text style={styles.detailLabel}>For Gift:</Text>
                <Text style={styles.detailValue}>{selectedVideo.giftName}</Text>

                {selectedVideo.duration && (
                  <>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>
                      {Math.floor(selectedVideo.duration / 60)}:
                      {String(selectedVideo.duration % 60).padStart(2, '0')}
                    </Text>
                  </>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApproveVideo(selectedVideo)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.sendButton]}
                  onPress={() => setShowSendModal(true)}
                  disabled={loading}
                >
                  <Ionicons name="mail" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectVideo(selectedVideo)}
                  disabled={loading}
                >
                  <Ionicons name="trash" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Send Email Modal */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.sendModalOverlay}>
          <View style={styles.sendModalContent}>
            <Text style={styles.sendModalTitle}>Send Video</Text>
            <Text style={styles.sendModalSubtitle}>
              Enter recipient's email address
            </Text>

            <TextInput
              style={styles.sendModalInput}
              placeholder="recipient@example.com"
              keyboardType="email-address"
              value={sendEmail}
              onChangeText={setSendEmail}
              editable={!loading}
            />

            <View style={styles.sendModalButtons}>
              <TouchableOpacity
                style={styles.sendModalCancel}
                onPress={() => setShowSendModal(false)}
                disabled={loading}
              >
                <Text style={styles.sendModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendModalSend}
                onPress={handleSendVideo}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.sendModalSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    paddingTop: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E0F2FE',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A2332',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#06B6D4',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#06B6D4',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0F172A',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0F2FE',
    marginBottom: 4,
  },
  videoSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  videoTime: {
    fontSize: 12,
    color: '#64748B',
  },
  videoType: {
    fontSize: 11,
    color: '#06B6D4',
    fontWeight: '600',
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E0F2FE',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  settingsContainer: {
    paddingVertical: 8,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E0F2FE',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0F2FE',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 13,
    color: '#94A3B8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0F2FE',
    marginBottom: 2,
  },
  logDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 12,
    color: '#64748B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E0F2FE',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F172A',
  },
  videoPlayer: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    paddingVertical: 60,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  videoPlayerText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsBox: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    marginTop: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0F2FE',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#06B6D4',
  },
  sendButton: {
    backgroundColor: '#0891B2',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  sendModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sendModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  sendModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sendModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  sendModalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  sendModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  sendModalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  sendModalSend: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
  },
  sendModalSendText: {
    color: 'white',
    fontWeight: '600',
  },
});
