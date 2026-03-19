import { supabase } from './supabaseClient.js';

export async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, weight_volume, image_url, category_id, stock_count, created_at, categories(name)')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching all products:', error.message, error.details, error.hint);
    throw error;
  }
  return data;
}

export async function getProductsByCategory(categoryId) {
  if (!categoryId) {
    return getAllProducts();
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, weight_volume, image_url, category_id, stock_count, created_at, categories(name)')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching products for category ID ${categoryId}:`, error.message);
    throw error;
  }
  return data;
}

export async function searchProducts(query) {
  if (!query) {
    return getAllProducts();
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, weight_volume, image_url, category_id, stock_count, created_at, categories(name)')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error searching products with query "${query}":`, error.message);
    throw error;
  }
  return data;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon_name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error.message);
    throw error;
  }
  return data;
}

export async function saveOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert([orderData])
    .select();

  if (error) {
    console.error('Error saving order:', error.message);
    throw error;
  }
  return data;
}

export async function updateProductStock(productId, quantityToReduce) {
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('stock_count')
    .eq('id', productId)
    .single();
  if (fetchErr) {
    console.error('Error fetching product stock:', fetchErr.message);
    throw fetchErr;
  }

  const currentStock = product.stock_count || 0;
  const newStock = Math.max(0, currentStock - quantityToReduce);

  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock_count: newStock })
    .eq('id', productId);

  if (updateErr) {
    console.error('Error updating product stock:', updateErr.message);
    throw updateErr;
  }
}

