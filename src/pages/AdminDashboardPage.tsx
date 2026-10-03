import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navigate } from '@/router';
import { formatPrice } from '@/data/products';
import { getUpiConfig, updateUpiConfig } from '@/lib/upi';

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { name: string; size: string; color: string; quantity: number; price: number }[];
  total_amount: number;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  verification_pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-ink-100 text-ink-700',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status] ?? 'bg-ink-100 text-ink-700'}`}
    >
      {label}
    </span>
  );
}

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as OrderRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/admin');
      } else {
        setAuthChecked(true);
        fetchOrders();
      }
    });
  }, [fetchOrders]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const updateOrderStatus = async (
    id: string,
    paymentStatus: string,
    orderStatus: string,
  action: string,
  ) => {
    setActionLoading(action);
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus, order_status: orderStatus })
      .eq('id', id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, payment_status: paymentStatus, order_status: orderStatus } : o,
        ),
      );
    }
    setActionLoading(null);
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center pt-16 md:pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-20">
      <section className="container-vesto py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Admin</p>
            <h1 className="display-heading mt-2 text-3xl md:text-4xl">ORDERS</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="btn-ghost"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowConfig(true)}
              className="btn-ghost"
            >
              <Settings className="h-4 w-4" /> UPI Config
            </button>
            <button onClick={handleSignOut} className="btn-ghost">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>

        {/* Orders table — desktop */}
        <div className="mt-8 hidden overflow-x-auto md:block">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-20 text-center text-sm text-ink-500">No orders yet.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                  <th className="py-3 pr-4">Order ID</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Phone</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Method</th>
                  <th className="py-3 pr-4">UPI Ref</th>
                  <th className="py-3 pr-4">Pay Status</th>
                  <th className="py-3 pr-4">Order Status</th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-ink-100 align-top">
                    <td className="py-3 pr-4 font-medium text-ink-900">
                      #{o.order_number}
                    </td>
                    <td className="py-3 pr-4 text-ink-700">{o.customer_name}</td>
                    <td className="py-3 pr-4 text-ink-700">{o.phone}</td>
                    <td className="py-3 pr-4 font-semibold text-ink-900">
                      {formatPrice(Number(o.total_amount))}
                    </td>
                    <td className="py-3 pr-4 text-ink-700">{o.payment_method}</td>
                    <td className="py-3 pr-4 text-ink-700">{o.payment_reference}</td>
                    <td className="py-3 pr-4"><StatusBadge status={o.payment_status} /></td>
                    <td className="py-3 pr-4"><StatusBadge status={o.order_status} /></td>
                    <td className="py-3 pr-4 text-xs text-ink-500">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, 'paid', 'confirmed', `verify-${o.id}`)
                          }
                          disabled={actionLoading === `verify-${o.id}` || o.payment_status === 'paid'}
                          className="inline-flex items-center gap-1 bg-green-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoading === `verify-${o.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Verify
                        </button>
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, 'rejected', 'cancelled', `reject-${o.id}`)
                          }
                          disabled={actionLoading === `reject-${o.id}` || o.payment_status === 'rejected'}
                          className="inline-flex items-center gap-1 bg-red-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoading === `reject-${o.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Orders cards — mobile */}
        <div className="mt-8 space-y-4 md:hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-20 text-center text-sm text-ink-500">No orders yet.</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="border border-ink-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink-900">#{o.order_number}</p>
                  <span className="text-xs text-ink-500">
                    {new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-ink-700">
                  <p>{o.customer_name} · {o.phone}</p>
                  <p className="font-semibold text-ink-900">{formatPrice(Number(o.total_amount))}</p>
                  <p className="text-xs text-ink-500">UPI Ref: {o.payment_reference}</p>
                </div>
                <div className="mt-2 flex gap-2">
                  <StatusBadge status={o.payment_status} />
                  <StatusBadge status={o.order_status} />
                </div>

                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-ink-500"
                >
                  {expanded === o.id ? 'Hide items' : 'View items'}
                </button>
                {expanded === o.id && (
                  <div className="mt-2 space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-600">
                    {o.items.map((it, idx) => (
                      <p key={idx}>
                        {it.name} — {it.size}, {it.color} ×{it.quantity} = {formatPrice(it.price * it.quantity)}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => updateOrderStatus(o.id, 'paid', 'confirmed', `verify-${o.id}`)}
                    disabled={actionLoading === `verify-${o.id}` || o.payment_status === 'paid'}
                    className="inline-flex flex-1 items-center justify-center gap-1 bg-green-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
                  >
                    {actionLoading === `verify-${o.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Verify
                  </button>
                  <button
                    onClick={() => updateOrderStatus(o.id, 'rejected', 'cancelled', `reject-${o.id}`)}
                    disabled={actionLoading === `reject-${o.id}` || o.payment_status === 'rejected'}
                    className="inline-flex flex-1 items-center justify-center gap-1 bg-red-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
                  >
                    {actionLoading === `reject-${o.id}` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showConfig && <UpiConfigModal onClose={() => setShowConfig(false)} />}
    </div>
  );
}

function UpiConfigModal({ onClose }: { onClose: () => void }) {
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getUpiConfig().then((c) => {
      setUpiId(c.upi_id);
      setDisplayName(c.upi_display_name);
    });
  }, []);

  const handleSave = async () => {
    if (!upiId.trim() || !displayName.trim()) return;
    setSaving(true);
    const ok = await updateUpiConfig(upiId.trim(), displayName.trim());
    setSaving(false);
    setMessage(ok ? 'Saved successfully.' : 'Could not save. Check permissions.');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/40 p-4">
      <div className="w-full max-w-md bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-900">
            UPI Configuration
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-ink-500" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              UPI ID
            </label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="YOUR-UPI-ID@BANK"
              className="input-vesto mt-1.5"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="VESTO MEN'S CLOTHING"
              className="input-vesto mt-1.5"
            />
          </div>
        </div>
        {message && (
          <p className="mt-3 text-sm text-ink-600">{message}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary mt-5 w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
    </div>
  );
}
