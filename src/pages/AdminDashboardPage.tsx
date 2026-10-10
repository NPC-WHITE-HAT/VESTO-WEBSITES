import { useState, useEffect, useCallback } from 'react';

import {
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  Settings,
  X,
  Plus,
  Pencil,
  Trash2,
  Package,
  Save,
  MoveUp,
  MoveDown,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { navigate } from '@/router';
import { formatPrice } from '@/data/products';
import { getUpiConfig, updateUpiConfig } from '@/lib/upi';
import { uploadImage as uploadCloudinaryImage } from '@/lib/cloudinary';
import {
  createOffer,
  deleteOffer,
  getOffers,
  updateOffer,
} from '@/lib/offers';
import type { Offer, ProductColor } from '@/types';

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
  total_amount: number;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  category: string;
  is_new: boolean;
  image: string;
  description: string;
  colors: {
    name: string;
    hex: string;
  }[];
  sizes: string[];
  fabric: string;
  created_at?: string;
}

interface ProductForm {
  id: string;
  name: string;
  price: string;
  category: string;
  is_new: boolean;
  image: string;
  description: string;
  colors: ProductColor[];
  sizes: string;
  fabric: string;
}

const STATUS_STYLES: Record<string, string> = {
  verification_pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  pending: 'bg-ink-100 text-ink-700',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function colorPickerValue(hex: string): string {
  if (/^#[\da-f]{6}$/i.test(hex)) return hex;
  const shortHex = hex.match(/^#([\da-f])([\da-f])([\da-f])$/i);
  return shortHex
    ? `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
    : '#000000';
}

const EMPTY_PRODUCT: ProductForm = {
  id: '',
  name: '',
  price: '',
  category: 'T-Shirts',
  is_new: true,
  image: '',
  description: '',
  colors: [{ name: 'Black', hex: '#1a1916' }],
  sizes: 'S, M, L, XL, XXL',
  fabric: '',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        STATUS_STYLES[status] ?? 'bg-ink-100 text-ink-700'
      }`}
    >
      {label}
    </span>
  );
}

export function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<ProductRow | null>(null);

  const [productForm, setProductForm] =
    useState<ProductForm>(EMPTY_PRODUCT);

  const [savingProduct, setSavingProduct] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'orders' | 'products' | 'banners'>('orders');

  const [authChecked, setAuthChecked] = useState(false);

  /*
   * -------------------------
   * ORDERS
   * -------------------------
   */

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

  /*
   * -------------------------
   * PRODUCTS
   * -------------------------
   */

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as ProductRow[]);
    } else if (error) {
      console.error('Failed to fetch products:', error);
    }

    setProductsLoading(false);
  }, []);

  const fetchOffers = useCallback(async () => {
    setOffersLoading(true);

    try {
      const data = await getOffers();
      setOffers(data);
      setOfferError('');
    } catch (error) {
      console.error('Failed to fetch homepage banners:', error);
      setOfferError(
        error instanceof Error
          ? error.message
          : 'Could not load homepage banners.',
      );
    } finally {
      setOffersLoading(false);
    }
  }, []);

  /*
   * -------------------------
   * AUTH
   * -------------------------
   */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/admin');
      } else {
        setAuthChecked(true);
        fetchOrders();
        fetchProducts();
        fetchOffers();
      }
    });
  }, [fetchOrders, fetchProducts, fetchOffers]);

  useEffect(() => {
    if (!newBannerFile) {
      setNewBannerPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(newBannerFile);
    setNewBannerPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [newBannerFile]);

  /*
   * -------------------------
   * SIGN OUT
   * -------------------------
   */

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  /*
   * -------------------------
   * ORDER STATUS
   * -------------------------
   */

  const updateOrderStatus = async (
    id: string,
    paymentStatus: string,
    orderStatus: string,
    action: string,
  ) => {
    setActionLoading(action);

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        order_status: orderStatus,
      })
      .eq('id', id);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                payment_status: paymentStatus,
                order_status: orderStatus,
              }
            : o,
        ),
      );
    }

    setActionLoading(null);
  };

  /*
   * -------------------------
   * OPEN ADD PRODUCT
   * -------------------------
   */

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);
    setShowProductModal(true);
  };

  /*
   * -------------------------
   * OPEN EDIT PRODUCT
   * -------------------------
   */

  const openEditProduct = (product: ProductRow) => {
    setEditingProduct(product);

    setProductForm({
      id: product.id,
      name: product.name,
      price: String(product.price),
      category: product.category,
      is_new: product.is_new,
      image: product.image,
      description: product.description,
      colors: product.colors ?? [],
      sizes: product.sizes.join(', '),
      fabric: product.fabric,
    });

    setShowProductModal(true);
  };

  /*
   * -------------------------
   * SAVE PRODUCT
   * -------------------------
   */

  const saveProduct = async () => {
    if (!productForm.name.trim()) {
      alert('Please enter product name.');
      return;
    }

    if (!productForm.price.trim()) {
      alert('Please enter product price.');
      return;
    }

    if (productForm.colors.length === 0) {
      alert('Please add at least one product color.');
      return;
    }

    const invalidColor = productForm.colors.find(
      (color) =>
        !color.name.trim() || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color.hex),
    );

    if (invalidColor) {
      alert('Each color needs a name and a valid hex value (for example #1a1916).');
      return;
    }

    const colors = productForm.colors.map(({ name, hex }) => ({
      name: name.trim(),
      hex,
    }));

    const sizes = productForm.sizes
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean);

    setSavingProduct(true);

    const productData = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      category: productForm.category,
      is_new: productForm.is_new,
      image: productForm.image.trim(),
      description: productForm.description.trim(),
      colors,
      sizes,
      fabric: productForm.fabric.trim(),
    };

    let error;

    if (editingProduct) {
      const result = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      error = result.error;
    } else {
      const newId =
        productForm.id.trim() ||
        productForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const result = await supabase.from('products').insert({
        id: newId,
        ...productData,
      });

      error = result.error;
    }

    setSavingProduct(false);

    if (error) {
      console.error(error);
      alert(`Could not save product: ${error.message}`);
      return;
    }

    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT);

    await fetchProducts();
  };

  /*
   * -------------------------
   * DELETE PRODUCT
   * -------------------------
   */

  const deleteProduct = async (product: ProductRow) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setActionLoading(`delete-${product.id}`);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id);

    if (error) {
      console.error(error);
      alert(`Could not delete product: ${error.message}`);
    } else {
      setProducts((prev) =>
        prev.filter((p) => p.id !== product.id),
      );
      await fetchProducts();
    }

    setActionLoading(null);
  };

  const addBanner = async () => {
    if (!newBannerFile) {
      setOfferError('Choose an image before adding a banner.');
      return;
    }

    setOfferActionLoading('new');
    setOfferError('');
    setOfferSuccess('');

    try {
      const image = await uploadCloudinaryImage(newBannerFile, 'vesto_offers');
      const position =
        offers.reduce((highest, offer) => Math.max(highest, offer.position), -1) +
        1;
      await createOffer({ image, position, active: true });
      setNewBannerFile(null);
      setOfferSuccess('Homepage banner added and activated.');
      await fetchOffers();
    } catch (error) {
      console.error('Failed to add homepage banner:', error);
      setOfferError(
        error instanceof Error ? error.message : 'Could not add banner.',
      );
    } finally {
      setOfferActionLoading(null);
    }
  };

  const replaceBanner = async (offer: Offer, file: File) => {
    setOfferActionLoading(`replace-${offer.id}`);
    setOfferError('');
    setOfferSuccess('');

    try {
      const image = await uploadCloudinaryImage(file, 'vesto_offers');
      await updateOffer(offer.id, { image });
      setOfferSuccess('Banner image replaced.');
      await fetchOffers();
    } catch (error) {
      console.error('Failed to replace homepage banner:', error);
      setOfferError(
        error instanceof Error ? error.message : 'Could not replace banner.',
      );
    } finally {
      setOfferActionLoading(null);
    }
  };

  const toggleBanner = async (offer: Offer) => {
    setOfferActionLoading(`toggle-${offer.id}`);
    setOfferError('');
    setOfferSuccess('');

    try {
      await updateOffer(offer.id, { active: !offer.active });
      setOfferSuccess(
        `Banner ${offer.active ? 'deactivated' : 'activated'}.`,
      );
      await fetchOffers();
    } catch (error) {
      console.error('Failed to update homepage banner:', error);
      setOfferError(
        error instanceof Error ? error.message : 'Could not update banner.',
      );
    } finally {
      setOfferActionLoading(null);
    }
  };

  const moveBanner = async (offer: Offer, direction: -1 | 1) => {
    const index = offers.findIndex((item) => item.id === offer.id);
    const neighbor = offers[index + direction];
    if (!neighbor) return;

    setOfferActionLoading(`move-${offer.id}`);
    setOfferError('');
    setOfferSuccess('');

    try {
      await updateOffer(offer.id, { position: neighbor.position });
      await updateOffer(neighbor.id, { position: offer.position });
      setOfferSuccess('Banner order updated.');
      await fetchOffers();
    } catch (error) {
      console.error('Failed to reorder homepage banners:', error);
      setOfferError(
        error instanceof Error ? error.message : 'Could not reorder banners.',
      );
      await fetchOffers();
    } finally {
      setOfferActionLoading(null);
    }
  };

  const removeBanner = async (offer: Offer) => {
    if (!window.confirm('Delete this homepage banner? This cannot be undone.')) {
      return;
    }

    setOfferActionLoading(`delete-${offer.id}`);
    setOfferError('');
    setOfferSuccess('');

    try {
      await deleteOffer(offer.id);
      setOfferSuccess('Banner deleted.');
      await fetchOffers();
    } catch (error) {
      console.error('Failed to delete homepage banner:', error);
      setOfferError(
        error instanceof Error ? error.message : 'Could not delete banner.',
      );
    } finally {
      setOfferActionLoading(null);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center pt-16 md:pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
      </div>
    );
  }

  return (
    <div className="min-w-0 pt-16 md:pt-20">
      <section className="container-vesto py-8 md:py-12">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Admin</p>

            <h1 className="display-heading mt-2 text-3xl md:text-4xl">
              VESTO ADMIN
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            <button
              onClick={() => {
                fetchOrders();
                fetchProducts();
                fetchOffers();
              }}
              className="btn-ghost"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              onClick={() => setShowConfig(true)}
              className="btn-ghost"
            >
              <Settings className="h-4 w-4" />
              UPI Config
            </button>

            <button
              onClick={handleSignOut}
              className="btn-ghost"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>

          </div>
        </div>

        {/* TABS */}

        <div className="mt-8 min-w-0 overflow-x-auto border-b border-ink-200">
          <div className="flex w-max min-w-full">

          <button
            onClick={() => setActiveTab('orders')}
            className={`shrink-0 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest sm:px-5 ${
              activeTab === 'orders'
                ? 'border-b-2 border-ink-900 text-ink-900'
                : 'text-ink-500'
            }`}
          >
            Orders
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`shrink-0 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest sm:px-5 ${
              activeTab === 'products'
                ? 'border-b-2 border-ink-900 text-ink-900'
                : 'text-ink-500'
            }`}
          >
            Products
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`shrink-0 whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-widest sm:px-5 ${
              activeTab === 'banners'
                ? 'border-b-2 border-ink-900 text-ink-900'
                : 'text-ink-500'
            }`}
          >
            Homepage Banners
          </button>

          </div>
        </div>

        {/* ======================================================
            ORDERS
        ====================================================== */}

        {activeTab === 'orders' && (
          <>
            {/* DESKTOP */}

            <div className="mt-8 hidden min-w-0 overflow-x-auto lg:block">

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-500">
                  No orders yet.
                </p>
              ) : (
                <table className="w-full min-w-[1100px] border-collapse text-sm">

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
                      <tr
                        key={o.id}
                        className="border-b border-ink-100 align-top"
                      >
                        <td className="py-3 pr-4 font-medium text-ink-900">
                          #{o.order_number}
                        </td>

                        <td className="py-3 pr-4 text-ink-700">
                          {o.customer_name}
                        </td>

                        <td className="py-3 pr-4 text-ink-700">
                          {o.phone}
                        </td>

                        <td className="py-3 pr-4 font-semibold text-ink-900">
                          {formatPrice(Number(o.total_amount))}
                        </td>

                        <td className="py-3 pr-4 text-ink-700">
                          {o.payment_method}
                        </td>

                        <td className="py-3 pr-4 text-ink-700">
                          {o.payment_reference}
                        </td>

                        <td className="py-3 pr-4">
                          <StatusBadge status={o.payment_status} />
                        </td>

                        <td className="py-3 pr-4">
                          <StatusBadge status={o.order_status} />
                        </td>

                        <td className="py-3 pr-4 text-xs text-ink-500">
                          {new Date(o.created_at).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </td>

                        <td className="py-3 pr-4">
                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                updateOrderStatus(
                                  o.id,
                                  'paid',
                                  'confirmed',
                                  `verify-${o.id}`,
                                )
                              }
                              disabled={
                                actionLoading === `verify-${o.id}` ||
                                o.payment_status === 'paid'
                              }
                              className="inline-flex items-center gap-1 bg-green-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
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
                                updateOrderStatus(
                                  o.id,
                                  'rejected',
                                  'cancelled',
                                  `reject-${o.id}`,
                                )
                              }
                              disabled={
                                actionLoading === `reject-${o.id}` ||
                                o.payment_status === 'rejected'
                              }
                              className="inline-flex items-center gap-1 bg-red-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
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

            {/* MOBILE */}

            <div className="mt-8 space-y-4 lg:hidden">

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-500">
                  No orders yet.
                </p>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="min-w-0 border border-ink-200 p-4"
                  >
                    <div className="flex items-center justify-between">

                      <p className="font-medium text-ink-900">
                        #{o.order_number}
                      </p>

                      <span className="text-xs text-ink-500">
                        {new Date(o.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: '2-digit',
                            month: 'short',
                          },
                        )}
                      </span>

                    </div>

                    <div className="mt-2 space-y-1 text-sm text-ink-700">

                      <p className="break-words">
                        {o.customer_name} · {o.phone}
                      </p>

                      <p className="font-semibold text-ink-900">
                        {formatPrice(Number(o.total_amount))}
                      </p>

                      <p className="break-all text-xs text-ink-500">
                        UPI Ref: {o.payment_reference}
                      </p>

                    </div>

                    <div className="mt-2 flex gap-2">
                      <StatusBadge status={o.payment_status} />
                      <StatusBadge status={o.order_status} />
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          expanded === o.id ? null : o.id,
                        )
                      }
                      className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-ink-500"
                    >
                      {expanded === o.id
                        ? 'Hide items'
                        : 'View items'}
                    </button>

                    {expanded === o.id && (
                      <div className="mt-2 space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-600">

                        {o.items.map((it, idx) => (
                          <p key={idx} className="break-words">
                            {it.name} — {it.size},{' '}
                            {it.color} ×{it.quantity} ={' '}
                            {formatPrice(
                              it.price * it.quantity,
                            )}
                          </p>
                        ))}

                      </div>
                    )}

                    <div className="mt-3 flex gap-2">

                      <button
                        onClick={() =>
                          updateOrderStatus(
                            o.id,
                            'paid',
                            'confirmed',
                            `verify-${o.id}`,
                          )
                        }
                        disabled={
                          actionLoading === `verify-${o.id}` ||
                          o.payment_status === 'paid'
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1 bg-green-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
                      >
                        Verify
                      </button>

                      <button
                        onClick={() =>
                          updateOrderStatus(
                            o.id,
                            'rejected',
                            'cancelled',
                            `reject-${o.id}`,
                          )
                        }
                        disabled={
                          actionLoading === `reject-${o.id}` ||
                          o.payment_status === 'rejected'
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1 bg-red-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white disabled:opacity-40"
                      >
                        Reject
                      </button>

                    </div>
                  </div>
                ))
              )}

            </div>
          </>
        )}

        {/* ======================================================
            PRODUCTS
        ====================================================== */}

        {activeTab === 'products' && (
          <div className="mt-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="section-eyebrow">
                  Inventory
                </p>

                <h2 className="display-heading mt-2 text-2xl md:text-3xl">
                  PRODUCTS
                </h2>
              </div>

              <button
                onClick={openAddProduct}
                className="btn-primary w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>

            </div>

            {productsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center">
                <Package className="mx-auto h-8 w-8 text-ink-300" />

                <p className="mt-3 text-sm text-ink-500">
                  No products found.
                </p>
              </div>
            ) : (
              <div className="mt-6 hidden min-w-0 overflow-x-auto lg:block">

                <table className="w-full min-w-[760px] border-collapse text-sm">

                  <thead>
                    <tr className="border-b border-ink-200 text-left text-[11px] font-semibold uppercase tracking-widest text-ink-500">

                      <th className="py-3 pr-4">
                        Product
                      </th>

                      <th className="py-3 pr-4">
                        Category
                      </th>

                      <th className="py-3 pr-4">
                        Price
                      </th>

                      <th className="py-3 pr-4">
                        New
                      </th>

                      <th className="py-3 pr-4">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-ink-100"
                      >

                        <td className="py-4 pr-4">

                          <div className="flex items-center gap-3">

                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-16 w-12 object-cover"
                            />

                            <div>

                              <p className="font-medium text-ink-900">
                                {product.name}
                              </p>

                              <p className="mt-1 text-xs text-ink-500">
                                {product.id}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="py-4 pr-4 text-ink-700">
                          {product.category}
                        </td>

                        <td className="py-4 pr-4 font-semibold">
                          {formatPrice(Number(product.price))}
                        </td>

                        <td className="py-4 pr-4">

                          {product.is_new ? (
                            <span className="text-xs font-semibold text-green-700">
                              YES
                            </span>
                          ) : (
                            <span className="text-xs text-ink-400">
                              NO
                            </span>
                          )}

                        </td>

                        <td className="py-4 pr-4">

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                openEditProduct(product)
                              }
                              className="inline-flex items-center gap-1 border border-ink-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:border-ink-900"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteProduct(product)
                              }
                              disabled={
                                actionLoading ===
                                `delete-${product.id}`
                              }
                              className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-red-700 hover:border-red-700 disabled:opacity-40"
                            >
                              {actionLoading ===
                              `delete-${product.id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}

                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>
            )}

            {!productsLoading && products.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:hidden">
                {products.map((product) => (
                  <article
                    key={product.id}
                    className="flex min-w-0 gap-3 border border-ink-200 p-3 sm:p-4"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-24 w-20 shrink-0 object-cover sm:h-28 sm:w-24"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="break-words font-medium text-ink-900">
                        {product.name}
                      </p>
                      <p className="mt-1 break-words text-xs text-ink-500">
                        {product.category}
                      </p>
                      <p className="mt-1 font-semibold text-ink-900">
                        {formatPrice(Number(product.price))}
                      </p>
                      <p
                        className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
                          product.is_new ? 'text-green-700' : 'text-ink-400'
                        }`}
                      >
                        {product.is_new ? 'New arrival' : 'Regular'}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2 pt-3">
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 border border-ink-200 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider hover:border-ink-900"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product)}
                          disabled={actionLoading === `delete-${product.id}`}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 border border-red-200 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-red-700 hover:border-red-700 disabled:opacity-40"
                        >
                          {actionLoading === `delete-${product.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

          </div>
        )}

        {activeTab === 'banners' && (
          <div className="mt-8">
            <div>
              <p className="section-eyebrow">Homepage</p>
              <h2 className="display-heading mt-2 text-2xl md:text-3xl">
                HOMEPAGE BANNERS
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
                Active banners appear in the homepage carousel, ordered by
                position. Images are uploaded to Cloudinary before a banner is
                saved.
              </p>
            </div>

            {offerError && (
              <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {offerError}
              </p>
            )}
            {offerSuccess && (
              <p role="status" className="mt-5 border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {offerSuccess}
              </p>
            )}

            <div className="mt-6 grid gap-5 border border-ink-200 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                  Add a banner image
                  <input
                    type="file"
                    accept="image/*"
                    disabled={offerActionLoading === 'new'}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      event.currentTarget.value = '';
                      setOfferError('');
                      setOfferSuccess('');
                      setNewBannerFile(file);
                    }}
                    className="mt-2 block w-full text-sm normal-case tracking-normal text-ink-700"
                  />
                </label>
                <p className="mt-2 text-xs text-ink-500">
                  Use a wide landscape image for the best desktop and mobile
                  crop.
                </p>
                {newBannerPreview && (
                  <img
                    src={newBannerPreview}
                    alt="New banner preview"
                    className="mt-4 aspect-[2.8/1] w-full object-cover sm:max-w-xl"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={addBanner}
                disabled={!newBannerFile || offerActionLoading === 'new'}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {offerActionLoading === 'new' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {offerActionLoading === 'new'
                  ? 'Uploading and saving'
                  : 'Add Banner'}
              </button>
            </div>

            {offersLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
              </div>
            ) : offers.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-500">
                No homepage banners yet. Add an image above to get started.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {offers.map((offer, index) => (
                  <article
                    key={offer.id}
                    className="grid gap-4 border border-ink-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <img
                        src={offer.image}
                        alt={`Homepage banner ${index + 1} preview`}
                        className="aspect-[2.8/1] w-full bg-ink-100 object-cover"
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-widest ${
                            offer.active ? 'text-green-700' : 'text-ink-400'
                          }`}
                        >
                          {offer.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-ink-400">
                          Position {offer.position + 1}
                        </span>
                      </div>
                      <label className="mt-3 block text-xs font-semibold uppercase tracking-widest text-ink-500">
                        Replace image
                        <input
                          type="file"
                          accept="image/*"
                          disabled={offerActionLoading === `replace-${offer.id}`}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = '';
                            if (file) void replaceBanner(offer, file);
                          }}
                          className="mt-1.5 block w-full text-sm normal-case tracking-normal text-ink-700"
                        />
                        {offerActionLoading === `replace-${offer.id}` && (
                          <span className="mt-1 block font-normal normal-case tracking-normal text-ink-500">
                            Uploading replacement to Cloudinary...
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2 md:max-w-44 md:justify-end">
                      <button
                        type="button"
                        onClick={() => void moveBanner(offer, -1)}
                        disabled={
                          index === 0 ||
                          offerActionLoading === `move-${offer.id}`
                        }
                        className="inline-flex items-center gap-1 border border-ink-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:border-ink-900 disabled:opacity-40"
                      >
                        <MoveUp className="h-3.5 w-3.5" />
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => void moveBanner(offer, 1)}
                        disabled={
                          index === offers.length - 1 ||
                          offerActionLoading === `move-${offer.id}`
                        }
                        className="inline-flex items-center gap-1 border border-ink-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:border-ink-900 disabled:opacity-40"
                      >
                        <MoveDown className="h-3.5 w-3.5" />
                        Move Down
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleBanner(offer)}
                        disabled={offerActionLoading === `toggle-${offer.id}`}
                        className="border border-ink-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider hover:border-ink-900 disabled:opacity-40"
                      >
                        {offer.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeBanner(offer)}
                        disabled={offerActionLoading === `delete-${offer.id}`}
                        className="inline-flex items-center gap-1 border border-red-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-red-700 hover:border-red-700 disabled:opacity-40"
                      >
                        {offerActionLoading === `delete-${offer.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

      </section>

      {/* PRODUCT MODAL */}

      {showProductModal && (
        <ProductModal
          form={productForm}
          setForm={setProductForm}
          editing={!!editingProduct}
          saving={savingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSave={saveProduct}
        />
      )}

      {/* UPI MODAL */}

      {showConfig && (
        <UpiConfigModal
          onClose={() => setShowConfig(false)}
        />
      )}

    </div>
  );
}

/*
 * ============================================================
 * PRODUCT MODAL
 * ============================================================
 */

function ProductModal({
  form,
  setForm,
  editing,
  saving,
  onClose,
  onSave,
}: {
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setImageUploadError('');

    try {
      const secureUrl = await uploadCloudinaryImage(file, 'vesto_products');
      setForm((currentForm) => ({
        ...currentForm,
        image: secureUrl,
      }));
    } catch (error) {
      console.error('Cloudinary image upload failed:', error);
      setImageUploadError(
        error instanceof Error
          ? error.message
          : 'Image upload failed. Please try again.',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-ink-950/40 p-2 sm:p-4">

      <div className="mx-auto my-2 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto bg-white p-4 sm:my-8 sm:max-h-[calc(100dvh-4rem)] sm:p-6">

        <div className="flex items-center justify-between">

          <div>

            <p className="section-eyebrow">
              {editing ? 'Edit' : 'New'}
            </p>

            <h2 className="display-heading mt-1 text-2xl">
              {editing
                ? 'EDIT PRODUCT'
                : 'ADD PRODUCT'}
            </h2>

          </div>

          <button
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5 text-ink-500" />
          </button>

        </div>

        <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-2">

          {/* PRODUCT NAME */}

          <div className="md:col-span-2">

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Product Name
            </label>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="VESTO Oversized Tee"
              className="input-vesto mt-1.5"
            />

          </div>

          {/* PRICE */}

          <div>

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Price
            </label>

            <input
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value,
                })
              }
              placeholder="699"
              className="input-vesto mt-1.5"
            />

          </div>

          {/* CATEGORY */}

          <div>

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Category
            </label>

            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
              className="input-vesto mt-1.5"
            >
              <option>T-Shirts</option>
              <option>Shirts</option>
              <option>Polos</option>
              <option>Trousers</option>
              <option>Jeans</option>
            </select>

          </div>

          {/* IMAGE */}

          <div className="md:col-span-2">

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Image URL
            </label>

            <input
              value={form.image}
              disabled={uploadingImage}
              onChange={(e) =>
                setForm({
                  ...form,
                  image: e.target.value,
                })
              }
              placeholder="https://images.pexels.com/..."
              className="input-vesto mt-1.5"
            />

            {!editing && (
              <>
                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                  Or upload an image
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void uploadImage(file);
                    }}
                    className="mt-1.5 block w-full text-sm normal-case tracking-normal text-ink-700"
                  />
                </label>

                {uploadingImage && (
                  <p className="mt-2 text-sm text-ink-500">
                    Uploading image to Cloudinary...
                  </p>
                )}
                {imageUploadError && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    {imageUploadError} Select an image to try again.
                  </p>
                )}
              </>
            )}

          </div>

          {/* DESCRIPTION */}

          <div className="md:col-span-2">

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              rows={4}
              placeholder="Product description..."
              className="input-vesto mt-1.5"
            />

          </div>

          {/* FABRIC */}

          <div>

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Fabric
            </label>

            <input
              value={form.fabric}
              onChange={(e) =>
                setForm({
                  ...form,
                  fabric: e.target.value,
                })
              }
              placeholder="240 GSM Combed Cotton"
              className="input-vesto mt-1.5"
            />

          </div>

          {/* SIZES */}

          <div>

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Sizes
            </label>

            <input
              value={form.sizes}
              onChange={(e) =>
                setForm({
                  ...form,
                  sizes: e.target.value,
                })
              }
              placeholder="S, M, L, XL, XXL"
              className="input-vesto mt-1.5"
            />

          </div>

          {/* COLORS */}

          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Colors
              </label>
              <button
                type="button"
                onClick={() =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    colors: [...currentForm.colors, { name: '', hex: '#000000' }],
                  }))
                }
                className="inline-flex items-center gap-1 border border-ink-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-700 transition-colors hover:border-ink-900 hover:text-ink-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Color
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {form.colors.map((color, index) => (
                <div
                  key={index}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border border-ink-200 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                >
                  <span
                    aria-label={`${color.name || 'Color'} swatch preview`}
                    className="h-10 w-10 border border-ink-200"
                    style={{
                      backgroundColor: /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(
                        color.hex,
                      )
                        ? colorPickerValue(color.hex)
                        : 'transparent',
                    }}
                  />
                  <label className="min-w-0 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                    Color name
                    <input
                      type="text"
                      value={color.name}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          colors: currentForm.colors.map((currentColor, i) =>
                            i === index
                              ? { ...currentColor, name: event.target.value }
                              : currentColor,
                          ),
                        }))
                      }
                      placeholder="e.g. Black"
                      className="input-vesto mt-1.5"
                    />
                  </label>
                  <div className="col-span-2 flex flex-wrap items-end gap-2 sm:col-span-1">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                      Pick color
                      <input
                        type="color"
                        value={colorPickerValue(color.hex)}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            colors: currentForm.colors.map((currentColor, i) =>
                              i === index
                                ? { ...currentColor, hex: event.target.value }
                                : currentColor,
                            ),
                          }))
                        }
                        aria-label={`Pick ${color.name || 'color'} swatch`}
                        className="mt-1 block h-10 w-12 cursor-pointer border border-ink-200 bg-white p-1"
                      />
                    </label>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                      Hex
                      <input
                        type="text"
                        value={color.hex}
                        onChange={(event) =>
                          setForm((currentForm) => ({
                            ...currentForm,
                            colors: currentForm.colors.map((currentColor, i) =>
                              i === index
                                ? { ...currentColor, hex: event.target.value }
                                : currentColor,
                            ),
                          }))
                        }
                        aria-label={`Hex value for ${color.name || `color ${index + 1}`}`}
                        placeholder="#1a1916"
                        className="input-vesto mt-1 w-28 px-2 font-mono text-xs"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        colors: currentForm.colors.filter((_, i) => i !== index),
                      }))
                    }
                    aria-label={`Remove ${color.name || `color ${index + 1}`}`}
                    className="inline-flex h-10 items-center justify-center border border-red-200 px-3 text-[10px] font-semibold uppercase tracking-wider text-red-700 transition-colors hover:border-red-700"
                  >
                    <Trash2 className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              ))}
              {form.colors.length === 0 && (
                <p className="border border-dashed border-ink-200 py-6 text-center text-sm text-ink-500">
                  No colors added yet. Add at least one color to continue.
                </p>
              )}
            </div>
          </div>

          {/* NEW PRODUCT */}

          <label className="flex items-center gap-2 md:col-span-2">

            <input
              type="checkbox"
              checked={form.is_new}
              onChange={(e) =>
                setForm({
                  ...form,
                  is_new: e.target.checked,
                })
              }
            />

            <span className="text-sm text-ink-700">
              Show as New Arrival
            </span>

          </label>

        </div>

        <div className="mt-6 flex gap-3">

          <button
            onClick={onClose}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={saving || uploadingImage || !!imageUploadError}
            className="btn-primary flex-1"
          >
            {uploadingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading image...
              </>
            ) : saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Product
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}

/*
 * ============================================================
 * UPI CONFIG MODAL
 * ============================================================
 */

function UpiConfigModal({
  onClose,
}: {
  onClose: () => void;
}) {
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
    if (!upiId.trim() || !displayName.trim()) {
      return;
    }

    setSaving(true);

    const ok = await updateUpiConfig(
      upiId.trim(),
      displayName.trim(),
    );

    setSaving(false);

    setMessage(
      ok
        ? 'Saved successfully.'
        : 'Could not save. Check permissions.',
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink-950/40 p-2 sm:items-center sm:p-4">

      <div className="my-2 max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto bg-white p-4 sm:my-0 sm:max-h-[calc(100dvh-2rem)] sm:p-6">

        <div className="flex items-center justify-between">

          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-900">
            UPI Configuration
          </h2>

          <button
            onClick={onClose}
            aria-label="Close"
          >
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
              onChange={(e) =>
                setUpiId(e.target.value)
              }
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
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              placeholder="VESTO MEN'S CLOTHING"
              className="input-vesto mt-1.5"
            />

          </div>

        </div>

        {message && (
          <p className="mt-3 text-sm text-ink-600">
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary mt-5 w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Configuration'
          )}
        </button>

      </div>

    </div>
  );
}