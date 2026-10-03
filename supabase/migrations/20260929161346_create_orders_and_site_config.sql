/*
# Create orders and site_config tables for UPI-only checkout

## Purpose
Enables a manual UPI verification checkout flow for the VESTO men's clothing
store. Customers place orders with a UPI transaction reference; the store admin
verifies or rejects the payment. No automatic payment confirmation.

## New Tables

### orders
Stores every order placed through the checkout.
- `id` (uuid, primary key)
- `order_number` (text, unique) — human-readable ID like VST-1001, auto-generated from a sequence
- `customer_name` (text, required)
- `phone` (text, required)
- `address` (text, required)
- `city` (text, required)
- `state` (text, required)
- `pincode` (text, required)
- `items` (jsonb, required) — array of {name, size, color, quantity, price, productId}
- `total_amount` (numeric, required)
- `payment_method` (text, default 'UPI')
- `payment_reference` (text, required) — the UTR / transaction number entered by the customer
- `payment_status` (text, default 'verification_pending') — one of: verification_pending, paid, rejected
- `order_status` (text, default 'pending') — one of: pending, confirmed, cancelled
- `created_at` (timestamptz, default now())

### site_config
Single-row configuration table for UPI settings, editable by admin without code changes.
- `id` (int, primary key, always 1)
- `upi_id` (text, default 'YOUR-UPI-ID@BANK')
- `upi_display_name` (text, default 'VESTO MEN'S CLOTHING')
- `updated_at` (timestamptz, default now())

## Sequence
- `order_number_seq` starts at 1001 so order numbers read VST-1001, VST-1002, ...

## Security (RLS)

### orders
- INSERT: any visitor (anon, authenticated) can place an order — the checkout is a no-auth customer flow.
- SELECT: only authenticated users (admin) can list all orders. Customers do not re-fetch orders from the DB; the success page uses the data returned from the insert.
- UPDATE: only authenticated users (admin) can update payment_status / order_status.
- DELETE: only authenticated users (admin) can delete.

This means a customer can place an order but can NEVER modify its payment status — only a signed-in admin can.

### site_config
- SELECT: any visitor (anon, authenticated) can read the UPI config — needed to display the UPI ID and QR code at checkout.
- UPDATE: only authenticated users (admin) can change the UPI config.
- INSERT: only authenticated users (admin) can insert the config row.

## Notes
1. The app has no customer sign-in screen. Customers interact as the anon role.
2. Admin access is via a separate /admin login page using Supabase email/password auth. The admin route is not linked from the public site.
3. payment_status starts as 'verification_pending' and order_status as 'pending'. The admin verifies (→ paid / confirmed) or rejects (→ rejected / cancelled).
*/

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT ('VST-' || nextval('order_number_seq')::text),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  items jsonb NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL DEFAULT 'UPI',
  payment_reference text NOT NULL,
  payment_status text NOT NULL DEFAULT 'verification_pending',
  order_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_insert_orders" ON orders;
CREATE POLICY "anyone_can_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_select_orders" ON orders;
CREATE POLICY "admin_can_select_orders" ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_can_update_orders" ON orders;
CREATE POLICY "admin_can_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_delete_orders" ON orders;
CREATE POLICY "admin_can_delete_orders" ON orders FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS site_config (
  id int PRIMARY KEY DEFAULT 1,
  upi_id text NOT NULL DEFAULT 'YOUR-UPI-ID@BANK',
  upi_display_name text NOT NULL DEFAULT 'VESTO MEN''S CLOTHING',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_site_config" ON site_config;
CREATE POLICY "anyone_can_read_site_config" ON site_config FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_can_insert_site_config" ON site_config;
CREATE POLICY "admin_can_insert_site_config" ON site_config FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_can_update_site_config" ON site_config;
CREATE POLICY "admin_can_update_site_config" ON site_config FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Seed the single config row
INSERT INTO site_config (id, upi_id, upi_display_name)
VALUES (1, 'YOUR-UPI-ID@BANK', 'VESTO MEN''S CLOTHING')
ON CONFLICT (id) DO NOTHING;
