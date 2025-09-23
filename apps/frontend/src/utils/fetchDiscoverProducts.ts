export async function fetchDiscoverProducts() {
  const resp = await fetch('https://api.escuelajs.co/api/v1/products?limit=20');
  if (!resp.ok) {
    throw new Error('Failed to fetch products');
  }
  const products = await resp.json();
  return products.map((p: any) => ({
    id: p.id.toString(),
    title: p.title,
    brand: p.category?.name || 'Brand',
    imageUrl: p.images?.[0] || '',
    link: p.images?.[0] || '',
    category: p.category?.name || '',
  }));
}
