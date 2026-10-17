-- Inventory starts at zero because no verified on-hand counts are available.
-- A submitted order reserves stock for 24 hours while UPI payment is verified.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_stock_quantity_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_stock_quantity_nonnegative
      CHECK (stock_quantity >= 0);
  END IF;
END
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS inventory_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON public.orders (idempotency_key);

CREATE TABLE IF NOT EXISTS public.order_inventory (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  state text NOT NULL DEFAULT 'deducted'
    CHECK (state IN ('deducted', 'restored')),
  PRIMARY KEY (order_id, product_id)
);

ALTER TABLE public.order_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_inventory FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_product_stock_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stock_quantity <> 0
       AND current_setting('vesto.allow_stock_update', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'Initial stock can only be set by the inventory workflow';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity
     AND current_setting('vesto.allow_stock_update', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Stock can only be changed by the inventory workflow';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_product_stock_update ON public.products;
CREATE TRIGGER guard_product_stock_update
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_stock_update();

CREATE OR REPLACE FUNCTION public.prevent_delete_reserved_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_inventory
    WHERE product_id = OLD.id AND state = 'deducted'
  ) THEN
    RAISE EXCEPTION 'This product has inventory tied to an order and cannot be deleted';
  END IF;
  RETURN OLD;
END
$$;

DROP TRIGGER IF EXISTS prevent_delete_reserved_product ON public.products;
CREATE TRIGGER prevent_delete_reserved_product
  BEFORE DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_reserved_product();

CREATE OR REPLACE FUNCTION public.set_product_stock(
  p_product_id text,
  p_stock_quantity integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RAISE EXCEPTION 'Administrator authentication is required';
  END IF;
  IF p_stock_quantity IS NULL OR p_stock_quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity must be a non-negative whole number';
  END IF;

  PERFORM set_config('vesto.allow_stock_update', 'on', true);
  UPDATE public.products
  SET stock_quantity = p_stock_quantity
  WHERE id = p_product_id
  RETURNING stock_quantity INTO v_stock;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  RETURN v_stock;
END
$$;

CREATE OR REPLACE FUNCTION public.expire_order_inventory()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order record;
  v_item record;
  v_expired integer := 0;
BEGIN
  FOR v_order IN
    SELECT id
    FROM public.orders
    WHERE payment_status = 'verification_pending'
      AND order_status = 'pending'
      AND inventory_expires_at <= now()
    ORDER BY inventory_expires_at, id
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM set_config('vesto.allow_stock_update', 'on', true);
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_inventory
      WHERE order_id = v_order.id AND state = 'deducted'
      ORDER BY product_id
      FOR UPDATE
    LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = v_order.id AND product_id = v_item.product_id;
    END LOOP;

    PERFORM set_config('vesto.allow_order_transition', 'on', true);
    UPDATE public.orders
    SET payment_status = 'expired', order_status = 'cancelled'
    WHERE id = v_order.id;
    v_expired := v_expired + 1;
  END LOOP;
  RETURN v_expired;
END
$$;

CREATE OR REPLACE FUNCTION public.place_order_with_stock(
  p_idempotency_key uuid,
  p_order jsonb
)
RETURNS TABLE(order_number text, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_total numeric;
  v_item record;
  v_available integer;
BEGIN
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Customer checkout is not available for this role';
  END IF;
  IF p_idempotency_key IS NULL
     OR p_order IS NULL
     OR jsonb_typeof(p_order->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid checkout request';
  END IF;
  IF jsonb_array_length(p_order->'items') = 0 THEN
    RAISE EXCEPTION 'Your order must include at least one item';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_order->'items') AS items(item)
    WHERE nullif(item->>'productId', '') IS NULL
       OR coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$'
  ) THEN
    RAISE EXCEPTION 'Every item must have a product and positive whole-number quantity';
  END IF;

  PERFORM public.expire_order_inventory();

  SELECT id, orders.order_number, orders.total_amount
    INTO v_order_id, v_order_number, v_total
  FROM public.orders
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_order_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = v_order_id
        AND payment_status = 'expired'
    ) THEN
      RAISE EXCEPTION 'CHECKOUT_ORDER_EXPIRED';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = v_order_id
        AND customer_name = p_order->>'customer_name'
        AND phone = p_order->>'phone'
        AND address = p_order->>'address'
        AND city = p_order->>'city'
        AND state = p_order->>'state'
        AND pincode = p_order->>'pincode'
        AND items = p_order->'items'
        AND payment_reference = p_order->>'payment_reference'
        AND total_amount = (p_order->>'total_amount')::numeric
    ) THEN
      RAISE EXCEPTION 'Idempotency key was reused with different order details';
    END IF;
    order_number := v_order_number;
    total_amount := v_total;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.orders (
    idempotency_key, inventory_expires_at,
    customer_name, phone, address, city, state, pincode,
    items, total_amount, payment_method, payment_reference,
    payment_status, order_status
  )
  VALUES (
    p_idempotency_key,
    now() + interval '24 hours',
    nullif(trim(p_order->>'customer_name'), ''),
    nullif(trim(p_order->>'phone'), ''),
    nullif(trim(p_order->>'address'), ''),
    nullif(trim(p_order->>'city'), ''),
    nullif(trim(p_order->>'state'), ''),
    nullif(trim(p_order->>'pincode'), ''),
    p_order->'items',
    (p_order->>'total_amount')::numeric,
    'UPI',
    nullif(trim(p_order->>'payment_reference'), ''),
    'verification_pending',
    'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id, orders.order_number, orders.total_amount
    INTO v_order_id, v_order_number, v_total;

  IF NOT FOUND THEN
    SELECT id, orders.order_number, orders.total_amount
      INTO v_order_id, v_order_number, v_total
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Could not safely resolve duplicate checkout request';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = v_order_id
        AND payment_status = 'expired'
    ) THEN
      RAISE EXCEPTION 'CHECKOUT_ORDER_EXPIRED';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders
      WHERE id = v_order_id
        AND customer_name = p_order->>'customer_name'
        AND phone = p_order->>'phone'
        AND address = p_order->>'address'
        AND city = p_order->>'city'
        AND state = p_order->>'state'
        AND pincode = p_order->>'pincode'
        AND items = p_order->'items'
        AND payment_reference = p_order->>'payment_reference'
        AND total_amount = (p_order->>'total_amount')::numeric
    ) THEN
      RAISE EXCEPTION 'Idempotency key was reused with different order details';
    END IF;
    order_number := v_order_number;
    total_amount := v_total;
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM set_config('vesto.allow_stock_update', 'on', true);
  FOR v_item IN
    SELECT item->>'productId' AS product_id,
           sum((item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_order->'items') AS items(item)
    GROUP BY item->>'productId'
    ORDER BY item->>'productId'
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
      AND stock_quantity >= v_item.quantity
    RETURNING stock_quantity INTO v_available;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_item.product_id
        USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.order_inventory (order_id, product_id, quantity)
    VALUES (v_order_id, v_item.product_id, v_item.quantity);
  END LOOP;

  order_number := v_order_number;
  total_amount := v_total;
  RETURN NEXT;
END
$$;

CREATE OR REPLACE FUNCTION public.transition_order_inventory(
  p_order_id uuid,
  p_action text
)
RETURNS TABLE(payment_status text, order_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RAISE EXCEPTION 'Administrator authentication is required';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('confirm', 'reject', 'cancel') THEN
    RAISE EXCEPTION 'Unsupported order action';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_action = 'confirm' THEN
    PERFORM public.expire_order_inventory();
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;
    IF v_order.payment_status = 'paid' AND v_order.order_status = 'confirmed' THEN
      payment_status := v_order.payment_status;
      order_status := v_order.order_status;
      RETURN NEXT;
      RETURN;
    END IF;
    IF v_order.payment_status <> 'verification_pending'
       OR v_order.order_status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending orders can be verified';
    END IF;
    IF v_order.idempotency_key IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.order_inventory
      WHERE order_id = p_order_id
        AND state = 'deducted'
    ) THEN
      RAISE EXCEPTION 'Order inventory reservation is missing or expired';
    END IF;
    PERFORM set_config('vesto.allow_order_transition', 'on', true);
    UPDATE public.orders
    SET payment_status = 'paid', order_status = 'confirmed'
    WHERE id = p_order_id;
  ELSIF p_action = 'reject' THEN
    IF v_order.payment_status = 'rejected' AND v_order.order_status = 'cancelled' THEN
      payment_status := v_order.payment_status;
      order_status := v_order.order_status;
      RETURN NEXT;
      RETURN;
    END IF;
    IF v_order.payment_status <> 'verification_pending'
       OR v_order.order_status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending orders can be rejected';
    END IF;
    PERFORM set_config('vesto.allow_stock_update', 'on', true);
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_inventory
      WHERE order_id = p_order_id AND state = 'deducted'
      ORDER BY product_id
      FOR UPDATE
    LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = p_order_id AND product_id = v_item.product_id;
    END LOOP;
    PERFORM set_config('vesto.allow_order_transition', 'on', true);
    UPDATE public.orders
    SET payment_status = 'rejected', order_status = 'cancelled'
    WHERE id = p_order_id;
  ELSE
    IF v_order.order_status = 'cancelled' THEN
      payment_status := v_order.payment_status;
      order_status := v_order.order_status;
      RETURN NEXT;
      RETURN;
    END IF;
    IF v_order.order_status <> 'confirmed' OR v_order.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Only confirmed orders can be cancelled';
    END IF;
    PERFORM set_config('vesto.allow_stock_update', 'on', true);
    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_inventory
      WHERE order_id = p_order_id AND state = 'deducted'
      ORDER BY product_id
      FOR UPDATE
    LOOP
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = p_order_id AND product_id = v_item.product_id;
    END LOOP;
    PERFORM set_config('vesto.allow_order_transition', 'on', true);
    UPDATE public.orders
    SET order_status = 'cancelled'
    WHERE id = p_order_id;
  END IF;

  SELECT o.payment_status, o.order_status
    INTO payment_status, order_status
  FROM public.orders AS o
  WHERE o.id = p_order_id;
  RETURN NEXT;
END
$$;

CREATE OR REPLACE FUNCTION public.guard_order_inventory_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.order_status IS DISTINCT FROM OLD.order_status)
     AND current_setting('vesto.allow_order_transition', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Order status can only be changed by the inventory workflow';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_order_inventory_transition ON public.orders;
CREATE TRIGGER guard_order_inventory_transition
  BEFORE UPDATE OF payment_status, order_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_inventory_transition();

REVOKE INSERT, UPDATE ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_product_stock(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_order_with_stock(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_inventory(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_order_inventory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_product_stock(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_with_stock(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_inventory(uuid, text) TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'vesto-expire-inventory-reservations';
SELECT cron.schedule(
  'vesto-expire-inventory-reservations',
  '*/5 * * * *',
  'SELECT public.expire_order_inventory();'
);
