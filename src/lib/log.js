import { supabase } from '@/lib/customSupabaseClient';

export const logAction = async (userId, actionType, description, companyId = null, targetUserId = null) => {
  if (!userId) {
    console.warn("logAction: userId is required to log an action.");
    return;
  }

  try {
    const { error } = await supabase
      .from('action_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        description: description,
        company_id: companyId,
        target_user_id: targetUserId,
      });

    if (error) {
      console.error("Error logging action:", error.message);
    }
  } catch (error) {
    console.error("Unexpected error in logAction:", error.message);
  }
};