/**
 * Frame Template Service
 * Handles CRUD operations for frame templates and assignments
 */

import { supabase } from '../supabaseClient';

// Priority levels for assignments
export const ASSIGNMENT_PRIORITY = {
  EVENT: 25,
  CHILD: 50,
  GUEST: 75,
  GIFT: 100,
};

// Available frame types
export const FRAME_TYPES = [
  { id: 'none', label: 'None', icon: 'remove-circle-outline' },
  { id: 'gradient-glow', label: 'Glow', icon: 'sunny-outline' },
  { id: 'neon-border', label: 'Neon', icon: 'flashlight-outline' },
  { id: 'soft-vignette', label: 'Soft', icon: 'ellipse-outline' },
  { id: 'celebration', label: 'Party', icon: 'sparkles-outline' },
  { id: 'minimal', label: 'Clean', icon: 'square-outline' },
];

// Available patterns
export const PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'balloons', label: 'Balloons' },
  { id: 'stars', label: 'Stars' },
  { id: 'smiles', label: 'Smiles' },
  { id: 'confetti', label: 'Confetti' },
  { id: 'hearts', label: 'Hearts' },
];

// Available colors
export const PRESET_COLORS = [
  { id: 'coral', hex: '#FF6B6B', label: 'Coral' },
  { id: 'teal', hex: '#00A699', label: 'Teal' },
  { id: 'yellow', hex: '#FFD93D', label: 'Yellow' },
  { id: 'purple', hex: '#A78BFA', label: 'Purple' },
  { id: 'blue', hex: '#3B82F6', label: 'Blue' },
  { id: 'pink', hex: '#EC4899', label: 'Pink' },
  { id: 'green', hex: '#10B981', label: 'Green' },
  { id: 'orange', hex: '#F97316', label: 'Orange' },
];

/**
 * Create a new frame template
 */
export const createFrameTemplate = async (templateData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('frame_templates')
      .insert({
        parent_id: user.id,
        name: templateData.name,
        description: templateData.description || null,
        frame_type: templateData.frameType || 'minimal',
        primary_color: templateData.primaryColor || '#FF6B6B',
        secondary_color: templateData.secondaryColor || '#FFD93D',
        border_color: templateData.borderColor || '#FFFFFF',
        pattern: templateData.pattern || 'none',
        default_text_position: templateData.textPosition || 'bottom',
        default_text_color: templateData.textColor || '#FFFFFF',
        border_width: templateData.borderWidth || 4,
        border_radius: templateData.borderRadius || 12,
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Frame template created:', data.name);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error creating frame template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all frame templates for the current user
 */
export const getFrameTemplates = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('frame_templates')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching frame templates:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get a single frame template by ID
 */
export const getFrameTemplate = async (templateId) => {
  try {
    const { data, error } = await supabase
      .from('frame_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error fetching frame template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update a frame template
 */
export const updateFrameTemplate = async (templateId, templateData) => {
  try {
    const { data, error } = await supabase
      .from('frame_templates')
      .update({
        name: templateData.name,
        description: templateData.description,
        frame_type: templateData.frameType,
        primary_color: templateData.primaryColor,
        secondary_color: templateData.secondaryColor,
        border_color: templateData.borderColor,
        pattern: templateData.pattern,
        default_text_position: templateData.textPosition,
        default_text_color: templateData.textColor,
        border_width: templateData.borderWidth,
        border_radius: templateData.borderRadius,
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Frame template updated:', data.name);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error updating frame template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a frame template
 */
export const deleteFrameTemplate = async (templateId) => {
  try {
    const { error } = await supabase
      .from('frame_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    console.log('✅ Frame template deleted');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting frame template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Assign a frame template to event/child/guest/gift
 * @param {string} templateId - Frame template ID
 * @param {object} assignment - { eventId?, childId?, guestId?, giftId? }
 */
export const assignFrame = async (templateId, assignment) => {
  try {
    // Determine priority based on assignment type
    let priority = ASSIGNMENT_PRIORITY.EVENT;
    if (assignment.giftId) priority = ASSIGNMENT_PRIORITY.GIFT;
    else if (assignment.guestId) priority = ASSIGNMENT_PRIORITY.GUEST;
    else if (assignment.childId) priority = ASSIGNMENT_PRIORITY.CHILD;

    const { data, error } = await supabase
      .from('frame_assignments')
      .insert({
        frame_template_id: templateId,
        event_id: assignment.eventId || null,
        child_id: assignment.childId || null,
        guest_id: assignment.guestId || null,
        gift_id: assignment.giftId || null,
        priority,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Frame assigned with priority:', priority);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error assigning frame:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a frame assignment
 */
export const removeFrameAssignment = async (assignmentId) => {
  try {
    const { error } = await supabase
      .from('frame_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;
    console.log('✅ Frame assignment removed');
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing frame assignment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all assignments for a frame template
 */
export const getFrameAssignments = async (templateId) => {
  try {
    const { data, error } = await supabase
      .from('frame_assignments')
      .select(`
        *,
        events (id, name),
        children (id, name),
        guests (id, name),
        gifts (id, name)
      `)
      .eq('frame_template_id', templateId)
      .order('priority', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching frame assignments:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get the applicable frame for a specific gift context
 * Returns the most specific frame based on priority
 */
export const getFrameForGift = async (giftId, childId, eventId, guestId = null) => {
  try {
    console.log('🖼️  getFrameForGift called with:', { giftId, childId, eventId, guestId });

    // Query for frame assignments using hierarchical matching
    // Priority: gift-specific (100) > guest-specific (75) > child-specific (50) > event-wide (25)
    let query = supabase
      .from('frame_assignments')
      .select(`
        *,
        frame_templates (*)
      `)
      .eq('is_active', true);

    // Build OR conditions for hierarchical matching
    // Each level can match if the specific ID matches OR if it's null (broader assignment)
    const orConditions = [];

    if (giftId) {
      orConditions.push(`gift_id.eq.${giftId}`);
    }
    if (guestId) {
      orConditions.push(`guest_id.eq.${guestId}`);
    }
    if (childId) {
      orConditions.push(`child_id.eq.${childId}`);
    }
    if (eventId) {
      orConditions.push(`event_id.eq.${eventId}`);
    }

    if (orConditions.length === 0) {
      console.log('ℹ️  No IDs provided, returning null');
      return { success: true, data: null };
    }

    console.log('🔍 Querying with OR conditions:', orConditions.join(','));

    query = query.or(orConditions.join(','));

    // Get ALL matching assignments, then pick the highest priority in JavaScript
    // This is more reliable than relying on Postgres .single() with .order()
    const { data: allMatches, error } = await query.order('priority', { ascending: false });

    if (error) {
      console.error('❌ Query error:', { code: error.code, message: error.message, details: error.details });
      throw error;
    }

    console.log(`🔍 Found ${allMatches?.length || 0} matching frame assignment(s)`);

    // Pick the highest priority match (first one since we ordered by priority DESC)
    const bestMatch = allMatches && allMatches.length > 0 ? allMatches[0] : null;

    if (bestMatch) {
      console.log('✅ Frame found:', {
        frameId: bestMatch.frame_template_id,
        frameName: bestMatch.frame_templates?.name,
        frameShape: bestMatch.frame_templates?.frame_shape,
        priority: bestMatch.priority,
        assignmentType: bestMatch.gift_id ? 'gift' : bestMatch.guest_id ? 'guest' : bestMatch.child_id ? 'child' : 'event'
      });
      return { success: true, data: bestMatch.frame_templates };
    } else {
      console.log('ℹ️  No frame assignment found for this gift/child/event');
      return { success: true, data: null };
    }
  } catch (error) {
    // PGRST205 = table not found - this is expected if frame_assignments table doesn't exist yet
    if (error.code === 'PGRST205') {
      console.log('⚠️  Frame assignments table not found - run database/frame_templates_schema.sql in Supabase');
      return { success: true, data: null };
    }
    // PGRST301 = RLS policy violation
    if (error.code === 'PGRST301' || error.message?.includes('RLS') || error.message?.includes('policy')) {
      console.error('🚫 RLS Policy Error - Kids cannot access frame assignments!');
      console.error('   Fix: Run database/fix_frame_rls_for_kids.sql in Supabase');
      return { success: true, data: null }; // Fail gracefully - video can still be recorded without frame
    }
    console.error('❌ Unexpected error getting frame for gift:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get all frames assigned to an event (including child-specific ones)
 */
export const getFramesForEvent = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('frame_assignments')
      .select(`
        *,
        frame_templates (*),
        children (id, name),
        guests (id, name)
      `)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error fetching frames for event:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Bulk assign frame to multiple entities
 * @param {string} templateId - Frame template ID
 * @param {object} bulkAssignment - { eventId?, childIds?: [], guestIds?: [] }
 */
export const bulkAssignFrame = async (templateId, bulkAssignment) => {
  try {
    const assignments = [];

    // Event-level assignment
    if (bulkAssignment.eventId && !bulkAssignment.childIds?.length && !bulkAssignment.guestIds?.length) {
      assignments.push({
        frame_template_id: templateId,
        event_id: bulkAssignment.eventId,
        priority: ASSIGNMENT_PRIORITY.EVENT,
        is_active: true,
      });
    }

    // Child-level assignments
    if (bulkAssignment.childIds?.length) {
      for (const childId of bulkAssignment.childIds) {
        assignments.push({
          frame_template_id: templateId,
          event_id: bulkAssignment.eventId || null,
          child_id: childId,
          priority: ASSIGNMENT_PRIORITY.CHILD,
          is_active: true,
        });
      }
    }

    // Guest-level assignments
    if (bulkAssignment.guestIds?.length) {
      for (const guestId of bulkAssignment.guestIds) {
        assignments.push({
          frame_template_id: templateId,
          event_id: bulkAssignment.eventId || null,
          guest_id: guestId,
          priority: ASSIGNMENT_PRIORITY.GUEST,
          is_active: true,
        });
      }
    }

    if (assignments.length === 0) {
      throw new Error('No valid assignments provided');
    }

    const { data, error } = await supabase
      .from('frame_assignments')
      .insert(assignments)
      .select();

    if (error) throw error;
    console.log(`✅ Bulk assigned frame to ${assignments.length} entities`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error bulk assigning frame:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createFrameTemplate,
  getFrameTemplates,
  getFrameTemplate,
  updateFrameTemplate,
  deleteFrameTemplate,
  assignFrame,
  removeFrameAssignment,
  getFrameAssignments,
  getFrameForGift,
  getFramesForEvent,
  bulkAssignFrame,
  FRAME_TYPES,
  PATTERNS,
  PRESET_COLORS,
  ASSIGNMENT_PRIORITY,
};
