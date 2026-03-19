export const seedData = [
  { name: 'Milo', price: 4500, weight_volume: '500g', category_id: 1, stock_count: 50 },
  { name: 'Peak Milk', price: 200, weight_volume: '14g', category_id: 1, stock_count: 200 },
  { name: 'Golden Penny Pasta', price: 850, weight_volume: '500g', category_id: 1, stock_count: 100 },
  { name: 'Sunlight Detergent', price: 2500, weight_volume: '900g', category_id: 2, stock_count: 80 },
  { name: 'Viva Soap', price: 400, weight_volume: '100g', category_id: 2, stock_count: 150 },
  { name: 'Omo', price: 3500, weight_volume: '1kg', category_id: 2, stock_count: 40 },
  { name: 'Plantain Chips', price: 500, weight_volume: '100g', category_id: 3, stock_count: 120 },
  { name: 'Pure Bliss Biscuits', price: 300, weight_volume: '50g', category_id: 3, stock_count: 300 },
  { name: 'Minimie Chinchin', price: 200, weight_volume: '60g', category_id: 3, stock_count: 250 },
  { name: 'Dano Milk', price: 4200, weight_volume: '500g', category_id: 1, stock_count: 60 }
];

export async function runSeed(supabase) {
  const { data, error } = await supabase.from('products').insert(seedData).select();
  if (error) {
    console.error('Error inserting seed data:', error);
  } else {
    console.log('Seed data inserted successfully:', data);
  }
}
