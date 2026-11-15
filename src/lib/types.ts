export type Role = 'admin' | 'manager';

export interface Company {
  id: string;
  name: string;
  currency: string;
}

export interface Membership {
  company_id: string;
  role: Role;
  shop_id: string | null;
}

export interface Shop {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
}

export interface Catalog {
  id: string;
  shop_id: string;
  name: string;
  position: number;
}

export interface Product {
  id: string;
  catalog_id: string;
  name: string;
  cost_price: number;
  price: number;
}

export interface ExpenseType {
  id: string;
  shop_id: string;
  name: string;
}

export interface Expense {
  id: string;
  shop_id: string;
  expense_type_id: string | null;
  catalog_id: string | null;
  label: string;
  amount: number;
  spent_on: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  total_amount: number;
  total_cost: number;
  item_count: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  shop_id: string;
  catalog_id: string | null;
  product_id: string | null;
  product_name: string;
  catalog_name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
  created_at: string;
}
