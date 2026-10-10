import { supabase } from '@/lib/supabase';
import type { Offer } from '@/types';

export async function getActiveOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, created_at, image, position, active')
    .eq('active', true)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Could not load homepage banners: ${error.message}`);
  }

  return (data ?? []) as Offer[];
}

export async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('id, created_at, image, position, active')
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Could not load homepage banners: ${error.message}`);
  }

  return (data ?? []) as Offer[];
}

export async function createOffer(
  offer: Pick<Offer, 'image' | 'position' | 'active'>,
): Promise<void> {
  const { error } = await supabase.from('offers').insert(offer);

  if (error) {
    throw new Error(`Could not save homepage banner: ${error.message}`);
  }
}

export async function updateOffer(
  id: string,
  updates: Partial<Pick<Offer, 'image' | 'position' | 'active'>>,
): Promise<void> {
  const { error } = await supabase.from('offers').update(updates).eq('id', id);

  if (error) {
    throw new Error(`Could not update homepage banner: ${error.message}`);
  }
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from('offers').delete().eq('id', id);

  if (error) {
    throw new Error(`Could not delete homepage banner: ${error.message}`);
  }
}
