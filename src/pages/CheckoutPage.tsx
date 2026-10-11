import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  ChevronLeft,
  Copy,
  CheckCheck,
  Smartphone,
  MessageCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice, WHATSAPP_NUMBER } from '@/data/products';
import { Link, navigate } from '@/router';
import { supabase } from '@/lib/supabase';
import { getUpiConfig, buildUpiDeepLink, buildUpiQrPayload, type UpiConfig } from '@/lib/upi';

type Step = 'details' | 'payment' | 'reference' | 'success';

interface OrderResult {
  orderNumber: string;
  totalAmount: number;
}

export function CheckoutPage() {
  const { items, subtotal, clear } = useCart();

  const [step, setStep] = useState<Step>('details');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [upiRef, setUpiRef] = useState('');
  const [copied, setCopied] = useState(false);
  const [upiConfig, setUpiConfig] = useState<UpiConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [order, setOrder] = useState<OrderResult | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const detailsValid =
    form.name.trim() &&
    /^\d{10}$/.test(form.phone.replace(/\s/g, '')) &&
    form.address.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    /^\d{6}$/.test(form.pincode.replace(/\s/g, ''));

  const refValid = upiRef.trim().length >= 6;

  // --- Empty cart guard ---
  if (items.length === 0 && step !== 'success') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center pt-16 text-center md:pt-20">
        <h1 className="display-heading text-3xl md:text-4xl">NOTHING TO CHECK OUT</h1>
        <p className="mt-3 text-sm text-ink-500">Your cart is empty.</p>
        <Link to="/shop" className="btn-primary mt-7">
          Shop Collection
        </Link>
      </div>
    );
  }

  // --- Success screen ---
  if (step === 'success' && order) {
    const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hi VESTO, I just placed order #${order.orderNumber}. My UPI reference is ${upiRef}.`,
    )}`;
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center pt-16 text-center md:pt-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900">
          <Check className="h-7 w-7 text-ink-50" />
        </div>
        <h1 className="display-heading mt-6 text-3xl md:text-4xl">ORDER PLACED</h1>
        <p className="mt-3 text-sm text-ink-600">
          Thank you for shopping with VESTO.
        </p>
        <div className="mt-6 border border-ink-200 bg-ink-100 px-8 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
            Order ID
          </p>
          <p className="mt-1 font-display text-2xl tracking-wider text-ink-900">
            #{order.orderNumber}
          </p>
        </div>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-600">
          Your payment is awaiting verification. We will confirm your order
          after verifying the UPI transaction.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/shop" className="btn-primary">
            Continue Shopping
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="btn-outline border-ink-300 text-ink-900 hover:bg-ink-900 hover:text-ink-50"
          >
            <MessageCircle className="h-4 w-4" /> Contact VESTO
          </a>
        </div>
      </div>
    );
  }

  // --- Actions ---
  const handleProceedToPayment = async () => {
    if (!detailsValid) return;
    setLoadingConfig(true);
    try {
      const config = await getUpiConfig();
      setUpiConfig(config);
      setStep('payment');
    } catch {
      setUpiConfig({
        upi_id: 'YOUR-UPI-ID@BANK',
        upi_display_name: "VESTO MEN'S CLOTHING",
      });
      setStep('payment');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleCopyUpi = async () => {
    if (!upiConfig) return;
    try {
      await navigator.clipboard.writeText(upiConfig.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handlePlaceOrder = async () => {
    if (!detailsValid || !refValid || items.length === 0) return;
    setSubmitting(true);
    setSubmitError('');

    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      price: i.product.price,
    }));

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        items: orderItems,
        total_amount: subtotal,
        payment_method: 'UPI',
        payment_reference: upiRef.trim(),
        payment_status: 'verification_pending',
        order_status: 'pending',
      })
      .select('order_number, total_amount')
      .single();

    if (error || !data) {
      setSubmitting(false);
      setSubmitError(
        'Could not place your order. Please check your connection and try again.',
      );
      return;
    }

    setOrder({ orderNumber: data.order_number, totalAmount: Number(data.total_amount) });
    clear();
    setSubmitting(false);
    setStep('success');
  };

  // --- Render ---
  const stepLabels: Record<Step, string> = {
    details: 'Customer Details',
    payment: 'UPI Payment',
    reference: 'Payment Reference',
    success: 'Order Placed',
  };

  return (
    <div className="pt-16 md:pt-20">
      <div className="container-vesto py-6">
        <button
          onClick={() => {
            if (step === 'payment') setStep('details');
            else if (step === 'reference') setStep('payment');
            else navigate('/cart');
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-ink-500 transition-colors hover:text-ink-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <section className="container-vesto pb-16">
        <p className="section-eyebrow">Checkout</p>
        <h1 className="display-heading mt-2 text-5xl md:text-7xl">Checkout</h1>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          {(['details', 'payment', 'reference'] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={
                  step === s
                    ? 'text-ink-900'
                    : 'text-ink-400'
                }
              >
                {idx + 1}. {stepLabels[s]}
              </span>
              {idx < 2 && <span className="text-ink-300">/</span>}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — Step content */}
          <div>
            {/* STEP 1: Customer Details */}
            {step === 'details' && (
              <div>
                <h2 className="font-display text-2xl font-medium text-ink-900">
                  Delivery Details
                </h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                      Full Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your full name"
                      className="input-vesto mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                      Phone Number
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="10-digit mobile number"
                      inputMode="tel"
                      maxLength={10}
                      className="input-vesto mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                      Delivery Address
                    </label>
                    <textarea
                      value={form.address}
                      onChange={(e) => update('address', e.target.value)}
                      placeholder="House no, street, area"
                      rows={3}
                      className="input-vesto mt-1.5 resize-none"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                        City
                      </label>
                      <input
                        value={form.city}
                        onChange={(e) => update('city', e.target.value)}
                        placeholder="City"
                        className="input-vesto mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                        State
                      </label>
                      <input
                        value={form.state}
                        onChange={(e) => update('state', e.target.value)}
                        placeholder="State"
                        className="input-vesto mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                        Pincode
                      </label>
                      <input
                        value={form.pincode}
                        onChange={(e) => update('pincode', e.target.value)}
                        placeholder="6-digit pincode"
                        inputMode="numeric"
                        maxLength={6}
                        className="input-vesto mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!detailsValid || loadingConfig}
                  className="btn-primary mt-8 w-full sm:w-auto"
                >
                  {loadingConfig ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
                {!detailsValid && (
                  <p className="mt-3 text-xs text-ink-500">
                    Fill in all delivery details to continue.
                  </p>
                )}
              </div>
            )}

            {/* STEP 2: UPI Payment */}
            {step === 'payment' && upiConfig && (
              <div>
                <h2 className="font-display text-2xl font-medium text-ink-900">
                  Pay With UPI
                </h2>

                {/* UPI ID + Copy */}
                <div className="mt-5 border border-ink-200 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                    UPI ID
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink-900">
                      {upiConfig.upi_id}
                    </p>
                    <button
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1.5 border border-ink-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-700 transition-colors hover:bg-ink-900 hover:text-ink-50"
                    >
                      {copied ? (
                        <>
                          <CheckCheck className="h-3.5 w-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy UPI ID
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="mt-5 flex flex-col items-center border border-ink-200 p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                    Scan to Pay
                  </p>
                  <div className="mt-4 bg-white p-4">
                    <QRCodeSVG
                      value={buildUpiQrPayload(
                        upiConfig.upi_id,
                        upiConfig.upi_display_name,
                        subtotal,
                      )}
                      size={180}
                      level="M"
                      marginSize={2}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-ink-500">
                    Amount: {formatPrice(subtotal)}
                  </p>
                </div>

                {/* Pay with UPI App (mobile deep link) */}
                <a
                  href={buildUpiDeepLink(
                    upiConfig.upi_id,
                    upiConfig.upi_display_name,
                    subtotal,
                  )}
                  className="btn-primary mt-5 w-full"
                >
                  <Smartphone className="h-4 w-4" /> Pay with UPI App
                </a>

                {/* How to pay instructions */}
                <div className="mt-6 border border-ink-200 bg-ink-100 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                    How to Pay
                  </p>
                  <ol className="mt-3 space-y-2 text-sm text-ink-700">
                    <li>1. Open Google Pay, PhonePe, Paytm or another UPI app.</li>
                    <li>2. Scan the QR code or use the VESTO UPI ID.</li>
                    <li>3. Pay the exact order amount ({formatPrice(subtotal)}).</li>
                    <li>4. Return to this page.</li>
                    <li>5. Enter your UPI transaction / reference number.</li>
                    <li>6. Submit your order.</li>
                  </ol>
                </div>

                <button
                  onClick={() => setStep('reference')}
                  className="btn-primary mt-6 w-full"
                >
                  I've Paid — Enter Reference
                </button>
              </div>
            )}

            {/* STEP 3: Payment Reference */}
            {step === 'reference' && (
              <div>
                <h2 className="font-display text-2xl font-medium text-ink-900">
                  Enter UPI Transaction / UTR Number
                </h2>
                <input
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="e.g. 123456789012"
                  inputMode="text"
                  className="input-vesto mt-5"
                />
                {!upiRef.trim() && (
                  <p className="mt-2 text-xs text-ink-500">
                    Enter the reference number from your UPI payment.
                  </p>
                )}
                {upiRef.trim() && upiRef.trim().length < 6 && (
                  <p className="mt-2 text-xs text-red-600">
                    Reference number must be at least 6 characters.
                  </p>
                )}

                <div className="mt-5 flex items-start gap-2 border border-ink-200 bg-ink-100 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
                  <p className="text-xs leading-relaxed text-ink-600">
                    Please make sure you have completed the UPI payment before
                    submitting your order.
                  </p>
                </div>

                {submitError && (
                  <p className="mt-4 text-sm text-red-600">{submitError}</p>
                )}

                <button
                  onClick={handlePlaceOrder}
                  disabled={!refValid || submitting}
                  className="btn-primary mt-6 w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Placing Order…
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — Order Summary (always visible) */}
          <div>
            <div className="bg-ink-100 p-6 md:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-900">
                Order Summary
              </h2>
              <div className="mt-5 space-y-4">
                {items.map((i) => (
                  <div
                    key={`${i.product.id}-${i.size}-${i.color}`}
                    className="flex gap-3"
                  >
                    <div className="h-16 w-14 shrink-0 overflow-hidden bg-ink-200">
                      <img
                        src={i.product.image}
                        alt={i.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <p className="text-sm font-medium text-ink-900">
                        {i.product.name}
                      </p>
                      <p className="text-xs text-ink-500">
                        {i.size} · {i.color} · Qty {i.quantity}
                      </p>
                    </div>
                    <p className="self-center text-sm font-semibold text-ink-900">
                      {formatPrice(i.product.price * i.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between border-t border-ink-200 pt-5">
                <span className="text-sm font-semibold uppercase tracking-widest text-ink-900">
                  Total
                </span>
                <span className="text-lg font-semibold text-ink-900">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
                <span className="inline-block h-2 w-2 rounded-full bg-ink-400" />
                Payment Method: UPI Only
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
