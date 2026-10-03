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
  colors: string;
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

const EMPTY_PRODUCT: ProductForm = {
  id: '',
  name: '',
  price: '',
  category: 'T-Shirts',
  is_new: true,
  image: '',
  description: '',
  colors: '[{"name":"Black","hex":"#1a1916"}]',
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

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showConfig, setShowConfig] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<ProductRow | null>(null);

  const [productForm, setProductForm] =
    useState<ProductForm>(EMPTY_PRODUCT);

  const [savingProduct, setSavingProduct] = useState(false);

  const [activeTab, setActiveTab] =
    useState<'orders' | 'products'>('orders');

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
      }
    });
  }, [fetchOrders, fetchProducts]);

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
      colors: JSON.stringify(product.colors),
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

    let colors;

    try {
      colors = JSON.parse(productForm.colors);
    } catch {
      alert(
        'Colors must be valid JSON. Example: [{"name":"Black","hex":"#1a1916"}]',
      );
      return;
    }

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

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-eyebrow">Admin</p>

            <h1 className="display-heading mt-2 text-3xl md:text-4xl">
              VESTO ADMIN
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              onClick={() => {
                fetchOrders();
                fetchProducts();
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

        <div className="mt-8 flex border-b border-ink-200">

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-widest ${
              activeTab === 'orders'
                ? 'border-b-2 border-ink-900 text-ink-900'
                : 'text-ink-500'
            }`}
          >
            Orders
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-widest ${
              activeTab === 'products'
                ? 'border-b-2 border-ink-900 text-ink-900'
                : 'text-ink-500'
            }`}
          >
            Products
          </button>

        </div>

        {/* ======================================================
            ORDERS
        ====================================================== */}

        {activeTab === 'orders' && (
          <>
            {/* DESKTOP */}

            <div className="mt-8 hidden overflow-x-auto md:block">

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
                </div>
              ) : orders.length === 0 ? (
                <p className="py-20 text-center text-sm text-ink-500">
                  No orders yet.
                </p>
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

            <div className="mt-8 space-y-4 md:hidden">

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
                    className="border border-ink-200 p-4"
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

                      <p>
                        {o.customer_name} · {o.phone}
                      </p>

                      <p className="font-semibold text-ink-900">
                        {formatPrice(Number(o.total_amount))}
                      </p>

                      <p className="text-xs text-ink-500">
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
                          <p key={idx}>
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

            <div className="flex items-center justify-between">

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
                className="btn-primary"
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
              <div className="mt-6 overflow-x-auto">

                <table className="w-full border-collapse text-sm">

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
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink-950/40 p-4">

      <div className="mx-auto my-8 w-full max-w-2xl bg-white p-6">

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

        <div className="mt-6 grid gap-4 md:grid-cols-2">

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
              onChange={(e) =>
                setForm({
                  ...form,
                  image: e.target.value,
                })
              }
              placeholder="https://images.pexels.com/..."
              className="input-vesto mt-1.5"
            />

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

            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
              Colors (JSON)
            </label>

            <textarea
              value={form.colors}
              onChange={(e) =>
                setForm({
                  ...form,
                  colors: e.target.value,
                })
              }
              rows={3}
              placeholder='[{"name":"Black","hex":"#1a1916"}]'
              className="input-vesto mt-1.5 font-mono text-xs"
            />

            <p className="mt-1 text-[10px] text-ink-400">
  Example: {'[{"name":"Black","hex":"#1a1916"}]'}
</p>

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
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? (
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/40 p-4">

      <div className="w-full max-w-md bg-white p-6">

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