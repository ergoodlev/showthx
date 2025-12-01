/**
 * Database Service
 * All Supabase database operations for ThankCast
 */

import { supabase } from '../supabaseClient';

// ===== PARENT OPERATIONS =====

export const getParentProfile = async (parentId) => {
  try {
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('id', parentId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateParentProfile = async (parentId, updates) => {
  try {
    const { data, error } = await supabase
      .from('parents')
      .update(updates)
      .eq('id', parentId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ===== EVENT OPERATIONS =====

export const getEventList = async (parentId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

export const createEvent = async (parentId, eventData) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        parent_id: parentId,
        ...eventData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateEvent = async (eventId, updates) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ===== GIFT OPERATIONS =====

export const getGiftList = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

export const createGift = async (eventId, giftData) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .insert({
        event_id: eventId,
        ...giftData,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateGift = async (giftId, updates) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .update(updates)
      .eq('id', giftId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const deleteGift = async (giftId) => {
  try {
    const { error } = await supabase
      .from('gifts')
      .delete()
      .eq('id', giftId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ===== KID OPERATIONS =====

export const getKidAssignments = async (kidCode) => {
  try {
    const { data: assignments, error } = await supabase
      .from('kid_assignments')
      .select('*, gifts(*)')
      .eq('kid_code', kidCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: assignments || [], error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

export const getPendingVideos = async (parentId) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*, events(*)')
      .eq('events.parent_id', parentId)
      .eq('status', 'recorded')
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

// ===== VIDEO OPERATIONS =====

export const getVideoMetadata = async (giftId) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateVideoStatus = async (giftId, status, updates = {}) => {
  try {
    const { data, error } = await supabase
      .from('gifts')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', giftId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// ===== GUEST OPERATIONS =====

export const getGuestList = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

export const addGuest = async (eventId, guestData) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .insert({
        event_id: eventId,
        ...guestData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const deleteGuest = async (guestId) => {
  try {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ===== VIDEO SHARING OPERATIONS =====

export const createVideoShare = async (giftId, guestId, expiresAt) => {
  try {
    const { data, error } = await supabase
      .from('video_shares')
      .insert({
        gift_id: giftId,
        guest_id: guestId,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const getVideoShareLink = async (shareId) => {
  try {
    const { data, error } = await supabase
      .from('video_shares')
      .select('*, gifts(video_url)')
      .eq('id', shareId)
      .single();

    if (error) throw error;
    if (data && new Date(data.expires_at) < new Date()) {
      return { data: null, error: 'Share link expired' };
    }
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export default {
  getParentProfile,
  updateParentProfile,
  getEventList,
  createEvent,
  updateEvent,
  deleteEvent,
  getGiftList,
  createGift,
  updateGift,
  deleteGift,
  getKidAssignments,
  getPendingVideos,
  getVideoMetadata,
  updateVideoStatus,
  getGuestList,
  addGuest,
  deleteGuest,
  createVideoShare,
  getVideoShareLink,
};
