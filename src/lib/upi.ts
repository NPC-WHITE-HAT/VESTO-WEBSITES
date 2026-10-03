import { supabase } from './supabase';

export interface UpiConfig {
  upi_id: string;
  upi_display_name: string;
}

const FALLBACK: UpiConfig = {
  upi_id: 'YOUR-UPI-ID@BANK',
  upi_display_name: "VESTO MEN'S CLOTHING",
};

export async function getUpiConfig(): Promise<UpiConfig> {
  const { data, error } = await supabase
    .from('site_config')
    .select('upi_id, upi_display_name')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return FALLBACK;
  return {
    upi_id: data.upi_id ?? FALLBACK.upi_id,
    upi_display_name: data.upi_display_name ?? FALLBACK.upi_display_name,
  };
}

export async function updateUpiConfig(upi_id: string, upi_display_name: string): Promise<boolean> {
  const { error } = await supabase
    .from('site_config')
    .update({ upi_id, upi_display_name, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    // Row may not exist yet — try insert
    const { error: insertError } = await supabase
      .from('site_config')
      .insert({ id: 1, upi_id, upi_display_name });
    if (insertError) return false;
  }
  return true;
}

export function buildUpiDeepLink(upiId: string, payeeName: string, amount: number): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: 'VESTO Order',
  });
  return `upi://pay?${params.toString()}`;
}

export function buildUpiQrPayload(upiId: string, payeeName: string, amount: number): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=VESTO%20Order`;
}
