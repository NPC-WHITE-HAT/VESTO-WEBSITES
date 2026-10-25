ALTER TABLE public.product_variant_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_read_product_variant_inventory"
  ON public.product_variant_inventory;

CREATE POLICY "anyone_can_read_product_variant_inventory"
  ON public.product_variant_inventory
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.product_variant_inventory TO anon, authenticated;
