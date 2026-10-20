-- Recreate the admin inventory RPC with the exact PostgREST named-argument
-- contract. Requires 20261020073000_add_size_color_variant_inventory.sql.
DO $$
BEGIN
  IF to_regclass('public.product_variant_inventory') IS NULL THEN
    RAISE EXCEPTION
      'Missing public.product_variant_inventory; apply the size/color inventory migration first';
  END IF;
  IF to_regclass('public.products') IS NULL
     OR to_regclass('public.order_inventory') IS NULL THEN
    RAISE EXCEPTION
      'Missing product/order inventory tables; apply the existing inventory migrations first';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'sizes'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'colors'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name = 'stock_quantity'
  ) THEN
    RAISE EXCEPTION
      'Missing product variant columns; apply the size/color inventory migration first';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_inventory'
      AND column_name = 'size'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_inventory'
      AND column_name = 'color'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_inventory'
      AND column_name = 'state'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_inventory'
      AND column_name = 'quantity'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'payment_status'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'order_status'
  ) THEN
    RAISE EXCEPTION
      'Missing variant reservation columns; apply the size/color inventory migration first';
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.set_product_variant_inventory(text, jsonb, jsonb);

CREATE FUNCTION public.set_product_variant_inventory(
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

REVOKE ALL ON FUNCTION public.set_product_variant_inventory(text, jsonb, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_product_variant_inventory(text, jsonb, jsonb)
  TO authenticated;

DO $$
BEGIN
  IF pg_get_function_arguments(
    'public.set_product_variant_inventory(text,jsonb,jsonb)'::regprocedure
  ) <> 'p_product_id text, p_variants jsonb, p_colors jsonb' THEN
    RAISE EXCEPTION 'Inventory RPC argument names or types do not match the frontend contract';
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
