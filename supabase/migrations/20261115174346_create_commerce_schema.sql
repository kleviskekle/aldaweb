/*
# Multi-shop commerce core schema

Plain-English summary: creates every table needed for a multi-company, multi-shop point of sale
with catalogs, products, expenses and sales, plus the access rules that decide who can see and
change what.

## 1. New Tables
- `companies`: the business (name, currency, default FCFA). Created by the first user.
- `shops`: points of sale belonging to a company.
- `company_members`: who belongs to a company. Role `admin` (whole company) or `manager`
  (limited to one assigned shop through `shop_id`).
- `company_invitations`: pending invitations for people who do not have an account yet. They are
  turned into memberships at their first sign-in (see the next migration).
- `catalogs`: unlimited product groups per shop (e.g. "Prestations", "Vêtements").
- `products`: items belonging to a catalog, with a purchase price (`cost_price`) and sale price (`price`).
- `expense_types`: custom expense categories per shop (e.g. Rent, Goods, Charges).
- `expenses`: amounts spent by a shop, optionally linked to a catalog.
- `sales`: one row per validated sale (totals and cost snapshot).
- `sale_items`: lines of a sale, with product name and prices frozen at the time of sale.

## 2. Security
- RLS enabled on every table. Every policy targets `authenticated` only (the app requires sign-in).
- Access is decided by three helper functions:
  - `is_company_member(company)`, `is_company_admin(company)`, `has_shop_access(shop)`.
  - They run with elevated rights so policies do not recurse into each other.
  - They are not callable by anonymous visitors.
- Sales and sale lines are read-only from the browser. They are written only by the `create_sale`
  function (next migration), which reads prices from the database.
- Expenses and catalogs: full CRUD for admins and managers of the shop.

## 3. Important notes
1. Deleting a catalog deletes its products; past sales keep their product name and prices.
2. Deleting a product or expense type keeps past sales and expenses (the link is cleared).
3. No destructive columns or tables are touched by this migration.
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'FCFA',
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shops_company_id_idx ON shops (company_id);

CREATE TABLE IF NOT EXISTS company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'manager')),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_members_unique UNIQUE (company_id, user_id),
  CONSTRAINT company_members_shop_required CHECK (role = 'admin' OR shop_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS company_members_user_id_idx ON company_members (user_id);

CREATE TABLE IF NOT EXISTS company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email)),
  role text NOT NULL CHECK (role IN ('admin', 'manager')),
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_invitations_unique UNIQUE (company_id, email),
  CONSTRAINT company_invitations_shop_required CHECK (role = 'admin' OR shop_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalogs_shop_id_idx ON catalogs (shop_id);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES catalogs(id) ON DELETE CASCADE,
  name text NOT NULL,
  cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_catalog_id_idx ON products (catalog_id);

CREATE TABLE IF NOT EXISTS expense_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_types_shop_id_idx ON expense_types (shop_id);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  expense_type_id uuid REFERENCES expense_types(id) ON DELETE SET NULL,
  catalog_id uuid REFERENCES catalogs(id) ON DELETE SET NULL,
  label text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  spent_on date NOT NULL DEFAULT current_date,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_shop_spent_idx ON expenses (shop_id, spent_on);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_cost numeric(14,2) NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_shop_created_idx ON sales (shop_id, created_at);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES catalogs(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  catalog_name text NOT NULL DEFAULT '',
  unit_price numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sale_items_shop_idx ON sale_items (shop_id);
CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON sale_items (sale_id);

-- Access helpers (elevated rights so policies do not recurse into each other)

CREATE OR REPLACE FUNCTION public.is_company_member(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members m
    WHERE m.company_id = p_company AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(p_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members m
    WHERE m.company_id = p_company AND m.user_id = auth.uid() AND m.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_shop_access(p_shop uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shops s
    JOIN company_members m ON m.company_id = s.company_id
    WHERE s.id = p_shop
      AND m.user_id = auth.uid()
      AND (m.role = 'admin' OR m.shop_id = s.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_shop_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_shop_access(uuid) TO authenticated;

-- Row level security

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON shops TO authenticated;
GRANT SELECT, DELETE ON company_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON company_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON catalogs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expense_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT ON sales TO authenticated;
GRANT SELECT ON sale_items TO authenticated;

-- companies
DROP POLICY IF EXISTS "companies_select_members" ON companies;
CREATE POLICY "companies_select_members" ON companies FOR SELECT
TO authenticated USING (is_company_member(id));

DROP POLICY IF EXISTS "companies_update_admin" ON companies;
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
TO authenticated USING (is_company_admin(id)) WITH CHECK (is_company_admin(id));

DROP POLICY IF EXISTS "companies_no_insert" ON companies;
DROP POLICY IF EXISTS "companies_no_delete" ON companies;

-- shops
DROP POLICY IF EXISTS "shops_select_access" ON shops;
CREATE POLICY "shops_select_access" ON shops FOR SELECT
TO authenticated USING (has_shop_access(id));

DROP POLICY IF EXISTS "shops_insert_admin" ON shops;
CREATE POLICY "shops_insert_admin" ON shops FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "shops_update_admin" ON shops;
CREATE POLICY "shops_update_admin" ON shops FOR UPDATE
TO authenticated USING (is_company_admin(company_id)) WITH CHECK (is_company_admin(company_id));

-- company_members
DROP POLICY IF EXISTS "members_select_self_or_admin" ON company_members;
CREATE POLICY "members_select_self_or_admin" ON company_members FOR SELECT
TO authenticated USING (user_id = auth.uid() OR is_company_admin(company_id));

DROP POLICY IF EXISTS "members_delete_admin" ON company_members;
CREATE POLICY "members_delete_admin" ON company_members FOR DELETE
TO authenticated USING (is_company_admin(company_id) AND user_id <> auth.uid());

-- company_invitations
DROP POLICY IF EXISTS "invitations_select_admin" ON company_invitations;
CREATE POLICY "invitations_select_admin" ON company_invitations FOR SELECT
TO authenticated USING (is_company_admin(company_id));

DROP POLICY IF EXISTS "invitations_insert_admin" ON company_invitations;
CREATE POLICY "invitations_insert_admin" ON company_invitations FOR INSERT
TO authenticated WITH CHECK (is_company_admin(company_id));

DROP POLICY IF EXISTS "invitations_delete_admin" ON company_invitations;
CREATE POLICY "invitations_delete_admin" ON company_invitations FOR DELETE
TO authenticated USING (is_company_admin(company_id));

-- catalogs
DROP POLICY IF EXISTS "catalogs_select_access" ON catalogs;
CREATE POLICY "catalogs_select_access" ON catalogs FOR SELECT
TO authenticated USING (has_shop_access(shop_id));

DROP POLICY IF EXISTS "catalogs_insert_access" ON catalogs;
CREATE POLICY "catalogs_insert_access" ON catalogs FOR INSERT
TO authenticated WITH CHECK (has_shop_access(shop_id));

DROP POLICY IF EXISTS "catalogs_update_access" ON catalogs;
CREATE POLICY "catalogs_update_access" ON catalogs FOR UPDATE
TO authenticated USING (has_shop_access(shop_id)) WITH CHECK (has_shop_access(shop_id));

DROP POLICY IF EXISTS "catalogs_delete_access" ON catalogs;
CREATE POLICY "catalogs_delete_access" ON catalogs FOR DELETE
TO authenticated USING (has_shop_access(shop_id));

-- products (access follows the catalog's shop)
DROP POLICY IF EXISTS "products_select_access" ON products;
CREATE POLICY "products_select_access" ON products FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM catalogs c WHERE c.id = products.catalog_id AND has_shop_access(c.shop_id))
);

DROP POLICY IF EXISTS "products_insert_access" ON products;
CREATE POLICY "products_insert_access" ON products FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM catalogs c WHERE c.id = products.catalog_id AND has_shop_access(c.shop_id))
);

DROP POLICY IF EXISTS "products_update_access" ON products;
CREATE POLICY "products_update_access" ON products FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM catalogs c WHERE c.id = products.catalog_id AND has_shop_access(c.shop_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM catalogs c WHERE c.id = products.catalog_id AND has_shop_access(c.shop_id))
);

DROP POLICY IF EXISTS "products_delete_access" ON products;
CREATE POLICY "products_delete_access" ON products FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM catalogs c WHERE c.id = products.catalog_id AND has_shop_access(c.shop_id))
);

-- expense_types
DROP POLICY IF EXISTS "expense_types_select_access" ON expense_types;
CREATE POLICY "expense_types_select_access" ON expense_types FOR SELECT
TO authenticated USING (has_shop_access(shop_id));

DROP POLICY IF EXISTS "expense_types_insert_access" ON expense_types;
CREATE POLICY "expense_types_insert_access" ON expense_types FOR INSERT
TO authenticated WITH CHECK (has_shop_access(shop_id));

DROP POLICY IF EXISTS "expense_types_update_access" ON expense_types;
CREATE POLICY "expense_types_update_access" ON expense_types FOR UPDATE
TO authenticated USING (has_shop_access(shop_id)) WITH CHECK (has_shop_access(shop_id));

DROP POLICY IF EXISTS "expense_types_delete_access" ON expense_types;
CREATE POLICY "expense_types_delete_access" ON expense_types FOR DELETE
TO authenticated USING (has_shop_access(shop_id));

-- expenses
DROP POLICY IF EXISTS "expenses_select_access" ON expenses;
CREATE POLICY "expenses_select_access" ON expenses FOR SELECT
TO authenticated USING (has_shop_access(shop_id));

DROP POLICY IF EXISTS "expenses_insert_access" ON expenses;
CREATE POLICY "expenses_insert_access" ON expenses FOR INSERT
TO authenticated WITH CHECK (has_shop_access(shop_id) AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "expenses_update_access" ON expenses;
CREATE POLICY "expenses_update_access" ON expenses FOR UPDATE
TO authenticated USING (has_shop_access(shop_id)) WITH CHECK (has_shop_access(shop_id));

DROP POLICY IF EXISTS "expenses_delete_access" ON expenses;
CREATE POLICY "expenses_delete_access" ON expenses FOR DELETE
TO authenticated USING (has_shop_access(shop_id));

-- sales and sale lines (written only by the create_sale function)
DROP POLICY IF EXISTS "sales_select_access" ON sales;
CREATE POLICY "sales_select_access" ON sales FOR SELECT
TO authenticated USING (has_shop_access(shop_id));

DROP POLICY IF EXISTS "sale_items_select_access" ON sale_items;
CREATE POLICY "sale_items_select_access" ON sale_items FOR SELECT
TO authenticated USING (has_shop_access(shop_id));
