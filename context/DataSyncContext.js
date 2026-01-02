/**
 * DataSyncContext
 * Provides centralized state management with Supabase realtime subscriptions
 * Automatically syncs data across all screens when videos, gifts, or events change
 *
 * Usage:
 * import { useDataSync } from '../context/DataSyncContext';
 *
 * const MyComponent = () => {
 *   const { videos, gifts, events, refreshAll } = useDataSync();
 *   // Data automatically updates when changes occur
 * };
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

const DataSyncContext = createContext();

/**
 * DataSyncProvider - Wraps app to provide synchronized data state
 */
export const DataSyncProvider = ({ children }) => {
  // Session state
  const [parentId, setParentId] = useState(null);
  const [kidId, setKidId] = useState(null);
  const [isParentSession, setIsParentSession] = useState(false);
  const [isKidSession, setIsKidSession] = useState(false);

  // Parent data state
  const [events, setEvents] = useState([]);
  const [childrenList, setChildrenList] = useState([]);
  const [pendingVideos, setPendingVideos] = useState([]);
  const [approvedVideos, setApprovedVideos] = useState([]);
  const [sentVideos, setSentVideos] = useState([]);
  const [processingJobs, setProcessingJobs] = useState([]);

  // Kid data state
  const [kidGifts, setKidGifts] = useState([]);
  const [kidVideos, setKidVideos] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Refs for subscription cleanup
  const subscriptionsRef = useRef([]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
    return () => cleanupSubscriptions();
  }, []);

  // Setup realtime subscriptions when session changes
  useEffect(() => {
    if (parentId || kidId) {
      setupRealtimeSubscriptions();
    }
    return () => cleanupSubscriptions();
  }, [parentId, kidId]);

  /**
   * Initialize session from AsyncStorage and Supabase auth
   */
  const initializeSession = async () => {
    try {
      setLoading(true);

      // Check for kid session first
      const storedKidId = await AsyncStorage.getItem('kidSessionId');
      if (storedKidId) {
        console.log('[DataSync] Kid session found:', storedKidId);
        setKidId(storedKidId);
        setIsKidSession(true);
        await loadKidData(storedKidId);
      }

      // Check for parent session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('[DataSync] Parent session found:', user.id);
        setParentId(user.id);
        setIsParentSession(true);
        await loadParentData(user.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('[DataSync] Error initializing session:', error);
      setLoading(false);
    }
  };

  /**
   * Clean up all Supabase subscriptions
   */
  const cleanupSubscriptions = () => {
    console.log('[DataSync] Cleaning up subscriptions');
    subscriptionsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    subscriptionsRef.current = [];
  };

  /**
   * Setup Supabase realtime subscriptions for videos, gifts, events
   */
  const setupRealtimeSubscriptions = () => {
    cleanupSubscriptions();

    if (parentId) {
      // Subscribe to videos table changes for this parent
      const videosChannel = supabase
        .channel('videos-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'videos',
            filter: `parent_id=eq.${parentId}`,
          },
          (payload) => {
            console.log('[DataSync] Video change:', payload.eventType);
            handleVideoChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[DataSync] Videos subscription:', status);
        });

      // Subscribe to gifts table changes
      const giftsChannel = supabase
        .channel('gifts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'gifts',
            filter: `parent_id=eq.${parentId}`,
          },
          (payload) => {
            console.log('[DataSync] Gift change:', payload.eventType);
            handleGiftChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[DataSync] Gifts subscription:', status);
        });

      // Subscribe to events table changes
      const eventsChannel = supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `parent_id=eq.${parentId}`,
          },
          (payload) => {
            console.log('[DataSync] Event change:', payload.eventType);
            handleEventChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[DataSync] Events subscription:', status);
        });

      // Subscribe to processing jobs
      const jobsChannel = supabase
        .channel('processing-jobs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'video_compositing_jobs',
            filter: `parent_id=eq.${parentId}`,
          },
          (payload) => {
            console.log('[DataSync] Processing job change:', payload.eventType);
            handleProcessingJobChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[DataSync] Processing jobs subscription:', status);
        });

      subscriptionsRef.current.push(videosChannel, giftsChannel, eventsChannel, jobsChannel);
    }

    if (kidId) {
      // Subscribe to videos table changes for this kid
      const kidVideosChannel = supabase
        .channel('kid-videos-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'videos',
            filter: `child_id=eq.${kidId}`,
          },
          (payload) => {
            console.log('[DataSync] Kid video change:', payload.eventType);
            handleKidVideoChange(payload);
          }
        )
        .subscribe((status) => {
          console.log('[DataSync] Kid videos subscription:', status);
        });

      subscriptionsRef.current.push(kidVideosChannel);
    }
  };

  /**
   * Handle video changes from realtime subscription
   */
  const handleVideoChange = async (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Refresh all video data to ensure consistency
    if (parentId) {
      await loadVideosForParent(parentId);
    }

    // Also refresh kid data if kid is logged in
    if (kidId) {
      await loadKidData(kidId);
    }
  };

  /**
   * Handle gift changes from realtime subscription
   */
  const handleGiftChange = async (payload) => {
    // Refresh relevant data
    if (parentId) {
      await loadEventsForParent(parentId);
    }
    if (kidId) {
      await loadKidData(kidId);
    }
  };

  /**
   * Handle event changes from realtime subscription
   * Uses payload data for updates to avoid race conditions with email templates
   */
  const handleEventChange = async (payload) => {
    if (!parentId) return;

    const { eventType, new: newRecord } = payload;

    if (eventType === 'UPDATE' && newRecord) {
      // Update just the changed event instead of full reload
      // This preserves email template fields that might be in-flight
      setEvents(prev => prev.map(e =>
        e.id === newRecord.id
          ? { ...e, ...newRecord }
          : e
      ));
    } else {
      // For INSERT/DELETE, do full reload
      await loadEventsForParent(parentId);
    }
  };

  /**
   * Handle processing job changes
   */
  const handleProcessingJobChange = (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      setProcessingJobs(prev => [newRecord, ...prev]);
    } else if (eventType === 'UPDATE') {
      setProcessingJobs(prev =>
        prev.map(job => job.id === newRecord.id ? newRecord : job)
      );
    } else if (eventType === 'DELETE') {
      setProcessingJobs(prev =>
        prev.filter(job => job.id !== oldRecord.id)
      );
    }
  };

  /**
   * Handle kid video changes
   */
  const handleKidVideoChange = async (payload) => {
    if (kidId) {
      await loadKidData(kidId);
    }
  };

  /**
   * Load all parent data
   */
  const loadParentData = async (userId) => {
    try {
      await Promise.all([
        loadEventsForParent(userId),
        loadChildrenForParent(userId),
        loadVideosForParent(userId),
        loadProcessingJobsForParent(userId),
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[DataSync] Error loading parent data:', error);
    }
  };

  /**
   * Load events for parent
   */
  const loadEventsForParent = async (userId) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        event_date,
        location,
        description,
        email_template_subject,
        email_template_greeting,
        email_template_message,
        email_template_gift_label,
        email_template_button_text,
        email_template_sign_off,
        allow_kids_frame_choice,
        created_at,
        updated_at,
        parent_id,
        gifts(id, gift_assignments(children_id))
      `)
      .eq('parent_id', userId)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('[DataSync] Error loading events:', error);
      return;
    }

    // Calculate counts for each event
    const eventsWithCounts = data?.map(event => ({
      ...event,
      gift_count: event.gifts?.length || 0,
      assigned_count: event.gifts?.filter(g =>
        g.gift_assignments && g.gift_assignments.length > 0
      ).length || 0,
    })) || [];

    setEvents(eventsWithCounts);
  };

  /**
   * Load children for parent
   */
  const loadChildrenForParent = async (userId) => {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('parent_id', userId)
      .order('name');

    if (error) {
      console.error('[DataSync] Error loading children:', error);
      return;
    }

    setChildrenList(data || []);
  };

  /**
   * Load videos for parent (categorized by status)
   */
  const loadVideosForParent = async (userId) => {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        child:children(id, name),
        gift:gifts(id, name, giver_name, event_id, event:events(name))
      `)
      .eq('parent_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DataSync] Error loading videos:', error);
      return;
    }

    const videos = data || [];

    // Categorize videos by status
    setPendingVideos(videos.filter(v => v.status === 'pending_approval'));
    setApprovedVideos(videos.filter(v => v.status === 'approved'));
    setSentVideos(videos.filter(v => v.status === 'sent'));
  };

  /**
   * Load processing jobs for parent
   */
  const loadProcessingJobsForParent = async (userId) => {
    const { data, error } = await supabase
      .from('video_compositing_jobs')
      .select('*')
      .eq('parent_id', userId)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DataSync] Error loading processing jobs:', error);
      return;
    }

    setProcessingJobs(data || []);
  };

  /**
   * Load kid data (gifts and videos)
   */
  const loadKidData = async (childId) => {
    try {
      // Load gift assignments
      const { data: giftsData, error: giftsError } = await supabase
        .from('gift_assignments')
        .select(`
          gift_id,
          gift:gifts(
            id,
            name,
            giver_name,
            event_id,
            event:events(name, allow_kids_frame_choice)
          )
        `)
        .eq('children_id', childId);

      if (giftsError) throw giftsError;

      // Load videos for this kid
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('gift_id, id, status, recorded_at, metadata')
        .eq('child_id', childId);

      if (videosError) throw videosError;

      // Create video lookup map
      const videosByGiftId = {};
      videosData?.forEach(video => {
        if (!videosByGiftId[video.gift_id] ||
            new Date(video.recorded_at) > new Date(videosByGiftId[video.gift_id].recorded_at)) {
          videosByGiftId[video.gift_id] = video;
        }
      });

      // Transform and filter gifts
      const transformedGifts = giftsData
        ?.map(assignment => {
          const video = videosByGiftId[assignment.gift.id];
          return {
            id: assignment.gift.id,
            name: assignment.gift.name,
            giver_name: assignment.gift.giver_name,
            event_name: assignment.gift.event?.name,
            event_id: assignment.gift.event_id,
            allow_kids_frame_choice: assignment.gift.event?.allow_kids_frame_choice || false,
            status: video?.status || 'pending',
            has_video: !!video,
            video_id: video?.id,
            parent_feedback: video?.metadata?.parent_feedback || null,
          };
        })
        .filter(gift => {
          // Filter out placeholder gifts
          const isPlaceholder =
            !gift.name ||
            gift.name.trim() === '' ||
            gift.name.toLowerCase().startsWith('gift from') ||
            gift.name.toLowerCase().includes('(no gift)') ||
            gift.name.toLowerCase() === 'no gift';
          return !isPlaceholder;
        })
        .sort((a, b) => {
          const priority = {
            needs_rerecord: 0,
            pending: 1,
            pending_approval: 2,
            approved: 3,
            sent: 4,
          };
          return (priority[a.status] ?? 5) - (priority[b.status] ?? 5);
        }) || [];

      setKidGifts(transformedGifts);
      setKidVideos(videosData || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('[DataSync] Error loading kid data:', error);
    }
  };

  /**
   * Refresh all data (can be called from any component)
   */
  const refreshAll = useCallback(async () => {
    console.log('[DataSync] Refreshing all data...');
    setRefreshing(true);

    try {
      if (parentId) {
        await loadParentData(parentId);
      }
      if (kidId) {
        await loadKidData(kidId);
      }
    } finally {
      setRefreshing(false);
    }
  }, [parentId, kidId]);

  /**
   * Refresh specific data type
   */
  const refreshVideos = useCallback(async () => {
    if (parentId) {
      await loadVideosForParent(parentId);
    }
    if (kidId) {
      await loadKidData(kidId);
    }
  }, [parentId, kidId]);

  const refreshEvents = useCallback(async () => {
    if (parentId) {
      await loadEventsForParent(parentId);
    }
  }, [parentId]);

  const refreshChildren = useCallback(async () => {
    if (parentId) {
      await loadChildrenForParent(parentId);
    }
  }, [parentId]);

  const refreshKidGifts = useCallback(async () => {
    if (kidId) {
      await loadKidData(kidId);
    }
  }, [kidId]);

  /**
   * Update session (called when user logs in/out)
   */
  const updateParentSession = useCallback(async (userId) => {
    console.log('[DataSync] Updating parent session:', userId);
    if (userId) {
      setParentId(userId);
      setIsParentSession(true);
      await loadParentData(userId);
    } else {
      setParentId(null);
      setIsParentSession(false);
      setEvents([]);
      setChildrenList([]);
      setPendingVideos([]);
      setApprovedVideos([]);
      setSentVideos([]);
      setProcessingJobs([]);
    }
  }, []);

  const updateKidSession = useCallback(async (childId) => {
    console.log('[DataSync] Updating kid session:', childId);
    if (childId) {
      setKidId(childId);
      setIsKidSession(true);
      await loadKidData(childId);
    } else {
      setKidId(null);
      setIsKidSession(false);
      setKidGifts([]);
      setKidVideos([]);
    }
  }, []);

  /**
   * Notify of video submission (triggers refresh across screens)
   */
  const notifyVideoSubmitted = useCallback(async () => {
    console.log('[DataSync] Video submitted, refreshing...');
    await refreshVideos();
  }, [refreshVideos]);

  /**
   * Notify of video approval/rejection
   */
  const notifyVideoStatusChanged = useCallback(async () => {
    console.log('[DataSync] Video status changed, refreshing...');
    await refreshVideos();
  }, [refreshVideos]);

  /**
   * Notify of video deletion
   */
  const notifyVideoDeleted = useCallback(async () => {
    console.log('[DataSync] Video deleted, refreshing...');
    await refreshVideos();
  }, [refreshVideos]);

  const value = {
    // Session info
    parentId,
    kidId,
    isParentSession,
    isKidSession,
    loading,
    refreshing,
    lastRefresh,

    // Parent data
    events,
    children: childrenList,
    pendingVideos,
    approvedVideos,
    sentVideos,
    processingJobs,

    // Kid data
    kidGifts,
    kidVideos,

    // Refresh functions
    refreshAll,
    refreshVideos,
    refreshEvents,
    refreshChildren,
    refreshKidGifts,

    // Session management
    updateParentSession,
    updateKidSession,

    // Event notifications
    notifyVideoSubmitted,
    notifyVideoStatusChanged,
    notifyVideoDeleted,
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};

/**
 * Hook to use DataSync context
 */
export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within DataSyncProvider');
  }
  return context;
};

export default DataSyncContext;
