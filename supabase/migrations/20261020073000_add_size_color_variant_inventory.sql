-- Size/color inventory is deliberately not backfilled from aggregate stock:
-- existing products must be allocated verified counts by an administrator.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'size'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'sizes'
  ) THEN
    ALTER TABLE public.products RENAME COLUMN size TO sizes;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'size'
  ) THEN
    UPDATE public.products
    SET sizes = size
    WHERE (sizes IS NULL OR sizes = '[]'::jsonb)
      AND size IS NOT NULL
      AND size <> '[]'::jsonb;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'sizes'
  ) THEN
    ALTER TABLE public.products
      ADD COLUMN sizes jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END
$$;

ALTER TABLE public.products
  ALTER COLUMN sizes SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.product_variant_inventory (
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
  color text NOT NULL DEFAULT '',
  available_quantity integer NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (product_id, size, color)
);

CREATE OR REPLACE FUNCTION public.guard_product_variant_configuration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.sizes IS DISTINCT FROM OLD.sizes
      OR NEW.colors IS DISTINCT FROM OLD.colors)
     AND current_setting('vesto.allow_variant_update', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Product sizes and colors can only be changed by the inventory workflow';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS guard_product_variant_configuration ON public.products;
CREATE TRIGGER guard_product_variant_configuration
  BEFORE UPDATE OF sizes, colors ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_variant_configuration();

ALTER TABLE public.product_variant_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_read_product_variant_inventory"
  ON public.product_variant_inventory;
CREATE POLICY "anyone_can_read_product_variant_inventory"
  ON public.product_variant_inventory FOR SELECT
  TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.product_variant_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_variant_inventory TO anon, authenticated;

ALTER TABLE public.order_inventory
  ADD COLUMN IF NOT EXISTS size text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '';

ALTER TABLE public.order_inventory
  DROP CONSTRAINT IF EXISTS order_inventory_pkey;
ALTER TABLE public.order_inventory
  ADD CONSTRAINT order_inventory_pkey
  PRIMARY KEY (order_id, product_id, size, color);

CREATE OR REPLACE FUNCTION public.set_product_variant_inventory(
  p_product_id text,
  p_variants jsonb,
  p_colors jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_colors jsonb;
  v_total integer;
  v_sizes jsonb;
  v_variant jsonb;
  v_size text;
  v_color text;
  v_enabled boolean;
  v_quantity integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RAISE EXCEPTION 'Administrator authentication is required';
  END IF;
  IF p_product_id IS NULL
     OR p_variants IS NULL
     OR jsonb_typeof(p_variants) IS DISTINCT FROM 'array'
     OR p_colors IS NULL
     OR jsonb_typeof(p_colors) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid product variant inventory';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_colors) AS rows(item)
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR nullif(trim(item->>'name'), '') IS NULL
       OR coalesce(item->>'hex', '') !~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_colors) AS rows(item)
    GROUP BY lower(trim(item->>'name'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Product colors must have unique names and valid hex values';
  END IF;

  SELECT colors
    INTO v_product_colors
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF EXISTS (
       SELECT 1
       FROM public.order_inventory AS oi
       JOIN public.orders AS orders ON orders.id = oi.order_id
       WHERE oi.product_id = p_product_id
         AND oi.size = ''
         AND oi.state = 'deducted'
         AND orders.payment_status = 'verification_pending'
         AND orders.order_status = 'pending'
     )
     AND EXISTS (
       SELECT 1
       FROM jsonb_array_elements(p_variants) AS rows(item)
       WHERE (item->>'enabled')::boolean
     ) THEN
    RAISE EXCEPTION 'Resolve pending aggregate-stock reservations before configuring size inventory';
  END IF;
  PERFORM set_config('vesto.allow_variant_update', 'on', true);
  UPDATE public.products
  SET colors = p_colors
  WHERE id = p_product_id;
  v_product_colors := p_colors;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_variants) AS rows(item)
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR coalesce(item->>'size', '') NOT IN ('S', 'M', 'L', 'XL', 'XXL')
       OR coalesce(item->>'available_quantity', '') !~ '^[0-9]+$'
       OR (item->>'available_quantity')::numeric > 2147483647
       OR jsonb_typeof(item->'enabled') IS DISTINCT FROM 'boolean'
  ) THEN
    RAISE EXCEPTION 'Variant size, enabled flag, or stock quantity is invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_variants) AS rows(item)
    GROUP BY item->>'size', coalesce(item->>'color', '')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate product size/color inventory rows';
  END IF;

  FOR v_variant IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    v_size := v_variant->>'size';
    v_color := coalesce(v_variant->>'color', '');
    v_enabled := (v_variant->>'enabled')::boolean;
    v_quantity := (v_variant->>'available_quantity')::integer;

    IF jsonb_array_length(coalesce(v_product_colors, '[]'::jsonb)) = 0 THEN
      IF v_color <> '' THEN
        RAISE EXCEPTION 'This product has no configured color named %', v_color;
      END IF;
    ELSIF v_color = '' OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(coalesce(v_product_colors, '[]'::jsonb)) AS colors(color)
      WHERE color->>'name' = v_color
    ) THEN
      RAISE EXCEPTION 'Color % is not configured for this product', v_color;
    END IF;

    IF NOT v_enabled AND EXISTS (
      SELECT 1
      FROM public.order_inventory AS oi
      WHERE oi.product_id = p_product_id
        AND oi.size = v_size
        AND oi.color = v_color
        AND oi.state = 'deducted'
    ) THEN
      RAISE EXCEPTION 'A size/color variant with a pending order reservation cannot be disabled';
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.product_variant_inventory AS inventory
    JOIN public.order_inventory AS oi
      ON oi.product_id = inventory.product_id
     AND oi.size = inventory.size
     AND oi.color = inventory.color
     AND oi.state = 'deducted'
    WHERE inventory.product_id = p_product_id
      AND inventory.enabled
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_variants) AS rows(item)
        WHERE item->>'size' = inventory.size
          AND coalesce(item->>'color', '') = inventory.color
          AND coalesce((item->>'enabled')::boolean, false)
      )
  ) THEN
    RAISE EXCEPTION 'A size/color variant with a pending order reservation cannot be disabled or removed';
  END IF;

  UPDATE public.product_variant_inventory
  SET enabled = false
  WHERE product_id = p_product_id;

  FOR v_variant IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    INSERT INTO public.product_variant_inventory (
      product_id, size, color, available_quantity, enabled
    )
    VALUES (
      p_product_id,
      v_variant->>'size',
      coalesce(v_variant->>'color', ''),
      (v_variant->>'available_quantity')::integer,
      (v_variant->>'enabled')::boolean
    )
    ON CONFLICT (product_id, size, color) DO UPDATE
    SET available_quantity = EXCLUDED.available_quantity,
        enabled = EXCLUDED.enabled;
  END LOOP;

  SELECT coalesce(
    jsonb_agg(size ORDER BY array_position(ARRAY['S', 'M', 'L', 'XL', 'XXL'], size)),
    '[]'::jsonb
  )
    INTO v_sizes
  FROM (
    SELECT DISTINCT size
    FROM public.product_variant_inventory
    WHERE product_id = p_product_id AND enabled
  ) AS enabled_sizes;

  IF (
    SELECT coalesce(sum(available_quantity), 0)
    FROM public.product_variant_inventory
    WHERE product_id = p_product_id AND enabled
  ) > 2147483647 THEN
    RAISE EXCEPTION 'Combined variant stock exceeds the supported product stock limit';
  END IF;

  SELECT coalesce(sum(available_quantity), 0)::integer
    INTO v_total
  FROM public.product_variant_inventory
  WHERE product_id = p_product_id AND enabled;

  PERFORM set_config('vesto.allow_stock_update', 'on', true);
  UPDATE public.products
  SET sizes = v_sizes,
      stock_quantity = v_total
  WHERE id = p_product_id;

  RETURN v_total;
END
$$;

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
  v_sizes jsonb;
  v_stock integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'authenticated' THEN
    RAISE EXCEPTION 'Administrator authentication is required';
  END IF;
  IF p_stock_quantity IS NULL OR p_stock_quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity must be a non-negative whole number';
  END IF;

  SELECT sizes INTO v_sizes
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF jsonb_array_length(coalesce(v_sizes, '[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Sized products must be managed through variant inventory';
  END IF;

  PERFORM set_config('vesto.allow_stock_update', 'on', true);
  UPDATE public.products
  SET stock_quantity = p_stock_quantity
  WHERE id = p_product_id
  RETURNING stock_quantity INTO v_stock;

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
      SELECT product_id, size, color, quantity
      FROM public.order_inventory
      WHERE order_id = v_order.id AND state = 'deducted'
      ORDER BY product_id, size, color
      FOR UPDATE
    LOOP
      PERFORM 1
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during expiry';
      END IF;

      IF v_item.size <> '' THEN
        UPDATE public.product_variant_inventory
        SET available_quantity = available_quantity + v_item.quantity
        WHERE product_id = v_item.product_id
          AND size = v_item.size
          AND color = v_item.color;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Reserved product variant is missing during expiry';
        END IF;
      END IF;

      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during expiry';
      END IF;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = v_order.id
        AND product_id = v_item.product_id
        AND size = v_item.size
        AND color = v_item.color;
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
  v_product_id text;
  v_product_sizes jsonb;
  v_product_colors jsonb;
  v_product_quantity integer;
  v_size text;
  v_color text;
  v_inventory_color text;
  v_quantity integer;
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
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR nullif(item->>'productId', '') IS NULL
       OR coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$'
       OR (item->>'quantity')::numeric > 2147483647
  ) THEN
    RAISE EXCEPTION 'Every item must have a product and positive whole-number quantity';
  END IF;

  PERFORM public.expire_order_inventory();

  SELECT id, orders.order_number, orders.total_amount
    INTO v_order_id, v_order_number, v_total
  FROM public.orders
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = v_order_id AND payment_status = 'expired'
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
      SELECT 1 FROM public.orders
      WHERE id = v_order_id AND payment_status = 'expired'
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
  FOR v_product_id IN
    SELECT DISTINCT item->>'productId'
    FROM jsonb_array_elements(p_order->'items') AS items(item)
    ORDER BY item->>'productId'
  LOOP
    SELECT sizes, colors
      INTO v_product_sizes, v_product_colors
    FROM public.products
    WHERE id = v_product_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_product_id;
    END IF;

    IF jsonb_array_length(coalesce(v_product_colors, '[]'::jsonb)) = 0 THEN
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_order->'items') AS items(item)
        WHERE item->>'productId' = v_product_id
          AND coalesce(item->>'color', '') <> ''
      ) THEN
        RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT:%', v_product_id;
      END IF;
    ELSIF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_order->'items') AS items(item)
      WHERE item->>'productId' = v_product_id
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(coalesce(v_product_colors, '[]'::jsonb)) AS colors(color)
          WHERE color->>'name' = item->>'color'
        )
    ) THEN
      RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT:%', v_product_id;
    END IF;
    v_product_quantity := 0;

    FOR v_item IN
      SELECT coalesce(item->>'size', '') AS size,
             CASE
               WHEN jsonb_array_length(coalesce(v_product_sizes, '[]'::jsonb)) > 0
                 THEN coalesce(item->>'color', '')
               ELSE ''
             END AS color,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(p_order->'items') AS items(item)
      WHERE item->>'productId' = v_product_id
      GROUP BY
        coalesce(item->>'size', ''),
        CASE
          WHEN jsonb_array_length(coalesce(v_product_sizes, '[]'::jsonb)) > 0
            THEN coalesce(item->>'color', '')
          ELSE ''
        END
      ORDER BY
        coalesce(item->>'size', ''),
        CASE
          WHEN jsonb_array_length(coalesce(v_product_sizes, '[]'::jsonb)) > 0
            THEN coalesce(item->>'color', '')
          ELSE ''
        END
    LOOP
      v_size := v_item.size;
      v_color := v_item.color;
      v_quantity := v_item.quantity;

      IF jsonb_array_length(coalesce(v_product_sizes, '[]'::jsonb)) > 0 THEN
        IF v_size NOT IN ('S', 'M', 'L', 'XL', 'XXL')
           OR NOT (coalesce(v_product_sizes, '[]'::jsonb) ? v_size) THEN
          RAISE EXCEPTION 'INVALID_PRODUCT_VARIANT:%', v_product_id;
        END IF;
        v_inventory_color := v_color;
        UPDATE public.product_variant_inventory
        SET available_quantity = available_quantity - v_quantity
        WHERE product_id = v_product_id
          AND size = v_size
          AND color = v_inventory_color
          AND enabled
          AND available_quantity >= v_quantity;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%:%', v_product_id, v_size, v_color
            USING ERRCODE = 'P0001';
        END IF;
      ELSE
        IF v_size <> '' THEN
          RAISE EXCEPTION 'SIZE_NOT_SUPPORTED:%', v_product_id;
        END IF;
        v_size := '';
        v_inventory_color := '';
      END IF;

      INSERT INTO public.order_inventory (
        order_id, product_id, size, color, quantity, state
      )
      VALUES (
        v_order_id, v_product_id, v_size, v_inventory_color, v_quantity, 'deducted'
      );
      v_product_quantity := v_product_quantity + v_quantity;
    END LOOP;

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_product_quantity
    WHERE id = v_product_id
      AND stock_quantity >= v_product_quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_product_id
        USING ERRCODE = 'P0001';
    END IF;
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

  PERFORM public.expire_order_inventory();

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_action = 'confirm' THEN
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
    IF v_order.inventory_expires_at IS NOT NULL
       AND v_order.inventory_expires_at <= now() THEN
      RAISE EXCEPTION 'Order inventory reservation has expired';
    END IF;
    IF v_order.idempotency_key IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.order_inventory
      WHERE order_id = p_order_id AND state = 'deducted'
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
      SELECT product_id, size, color, quantity
      FROM public.order_inventory
      WHERE order_id = p_order_id AND state = 'deducted'
      ORDER BY product_id, size, color
      FOR UPDATE
    LOOP
      PERFORM 1
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during rejection';
      END IF;

      IF v_item.size <> '' THEN
        UPDATE public.product_variant_inventory
        SET available_quantity = available_quantity + v_item.quantity
        WHERE product_id = v_item.product_id
          AND size = v_item.size
          AND color = v_item.color;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Reserved product variant is missing during rejection';
        END IF;
      END IF;
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during rejection';
      END IF;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = p_order_id
        AND product_id = v_item.product_id
        AND size = v_item.size
        AND color = v_item.color;
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
      SELECT product_id, size, color, quantity
      FROM public.order_inventory
      WHERE order_id = p_order_id AND state = 'deducted'
      ORDER BY product_id, size, color
      FOR UPDATE
    LOOP
      PERFORM 1
      FROM public.products
      WHERE id = v_item.product_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during cancellation';
      END IF;

      IF v_item.size <> '' THEN
        UPDATE public.product_variant_inventory
        SET available_quantity = available_quantity + v_item.quantity
        WHERE product_id = v_item.product_id
          AND size = v_item.size
          AND color = v_item.color;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Reserved product variant is missing during cancellation';
        END IF;
      END IF;
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product is missing during cancellation';
      END IF;
      UPDATE public.order_inventory
      SET state = 'restored'
      WHERE order_id = p_order_id
        AND product_id = v_item.product_id
        AND size = v_item.size
        AND color = v_item.color;
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

REVOKE ALL ON FUNCTION public.set_product_variant_inventory(text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_product_stock(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_order_with_stock(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_order_inventory(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_order_inventory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_product_variant_inventory(text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_stock(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order_with_stock(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order_inventory(uuid, text) TO authenticated;
