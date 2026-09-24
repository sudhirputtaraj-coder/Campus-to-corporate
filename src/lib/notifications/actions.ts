'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseWhatsAppPreferences } from './preferences';

export async function saveWhatsAppPreferences(form: FormData) {
  const parsed = parseWhatsAppPreferences(form);
  if (parsed.error || !parsed.values) return { error: parsed.error || 'Check your preferences.' };
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };
  const { error } = await client.rpc('fn_save_whatsapp_preferences', parsed.values);
  if (error) return { error: 'Preferences could not be saved. Please try again or contact platform support.' };
  revalidatePath('/student/notifications');
  return { success: true };
}
