/*
# Business functions: company creation, invitation claiming, sale validation

Plain-English summary: adds three secure actions the app calls instead of writing directly to
the database. They keep onboarding atomic, let invited team members join automatically, and make
sure every sale is priced from the database rather than from the browser.

## 1. New Functions
- `create_company(name, currency, shop name, shop address)`: creates the company, makes the
  caller its admin and creates its first shop in one step.
- `claim_my_invitations()`: turns every invitation addressed to the signed-in user's email into a
  membership (admin or manager of an assigned shop) and removes the invitation.
- `create_sale(shop, items)`: checks the caller can access the shop, reads each product's current
  price and purchase cost from the database, stores the sale and its lines, and returns the sale id.

## 2. Security
- Each function checks the caller is signed in. `create_sale` also checks shop access.
- Functions are executable only by signed-in users (not by anonymous visitors or the public).
- Sales cannot be altered by the browser: clients cannot insert sales directly.

## 3. Important notes
1. Quantities must be between 1 and 1000 per line.
2. Products that no longer exist are rejected at sale time, which keeps totals accurate.
*/

CREATE OR REPLACE FUNCTION public.create_company(
  p_name text,
  p_currency text,
  p_shop_name text,
  p_shop_address text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Vous devez être connecté.' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Le nom de l''entreprise est requis.';
  END IF;
  IF length(trim(coalesce(p_shop_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Le nom de la boutique est requis.';
  END IF;

  INSERT INTO companies (name, currency, created_by)
  VALUES (trim(p_name), coalesce(nullif(trim(coalesce(p_currency, '')), ''), 'FCFA'), v_uid)
  RETURNING id INTO v_company;

  INSERT INTO company_members (company_id, user_id, role)
  VALUES (v_company, v_uid, 'admin');

  INSERT INTO shops (company_id, name, address)
  VALUES (v_company, trim(p_shop_name), nullif(trim(coalesce(p_shop_address, '')), ''));

  RETURN v_company;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_my_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  r record;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;

  FOR r IN SELECT * FROM company_invitations WHERE email = v_email LOOP
    INSERT INTO company_members (company_id, user_id, role, shop_id)
    VALUES (r.company_id, v_uid, r.role, r.shop_id)
    ON CONFLICT (company_id, user_id) DO NOTHING;

    DELETE FROM company_invitations WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sale(p_shop uuid, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale uuid;
  v_item jsonb;
  v_qty integer;
  v_product record;
  v_total numeric(14,2) := 0;
  v_cost numeric(14,2) := 0;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT has_shop_access(p_shop) THEN
    RAISE EXCEPTION 'Accès refusé à cette boutique.' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Le panier est vide.';
  END IF;

  INSERT INTO sales (shop_id) VALUES (p_shop) RETURNING id INTO v_sale;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 1000 THEN
      RAISE EXCEPTION 'Quantité invalide.';
    END IF;

    SELECT p.id, p.name, p.price, p.cost_price, c.id AS catalog_id, c.name AS catalog_name
    INTO v_product
    FROM products p
    JOIN catalogs c ON c.id = p.catalog_id
    WHERE p.id = (v_item->>'product_id')::uuid AND c.shop_id = p_shop;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Un produit du panier n''existe plus dans cette boutique.';
    END IF;

    INSERT INTO sale_items (sale_id, shop_id, catalog_id, product_id, product_name, catalog_name, unit_price, unit_cost, quantity)
    VALUES (v_sale, p_shop, v_product.catalog_id, v_product.id, v_product.name, v_product.catalog_name, v_product.price, v_product.cost_price, v_qty);

    v_total := v_total + v_product.price * v_qty;
    v_cost := v_cost + v_product.cost_price * v_qty;
    v_count := v_count + v_qty;
  END LOOP;

  UPDATE sales
  SET total_amount = v_total, total_cost = v_cost, item_count = v_count
  WHERE id = v_sale;

  RETURN v_sale;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_company(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_my_invitations() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_sale(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_my_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale(uuid, jsonb) TO authenticated;
