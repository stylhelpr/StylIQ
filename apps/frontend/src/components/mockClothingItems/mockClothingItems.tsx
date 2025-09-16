export const mockClothingItems = Array.from({length: 100}, (_, index) => {
  const categories = [
    'Linen Shirt',
    'Oxford Shirt',
    'Polo Shirt',
    'Cashmere Sweater',
    'Wool Blazer',
    'Trench Coat',
    'Bomber Jacket',
    'Peacoat',
    'Chinos',
    'Denim Jeans',
    'Wool Trousers',
    'Corduroy Pants',
    'Loafers',
    'Oxfords',
    'Chelsea Boots',
    'White Sneakers',
    'Silk Scarf',
    'Leather Belt',
    'Wool Beanie',
    'Baseball Cap',
  ];

  const colors = [
    'White',
    'Black',
    'Navy',
    'Beige',
    'Olive',
    'Gray',
    'Brown',
    'Tan',
  ];

  const name = `${colors[index % colors.length]} ${
    categories[index % categories.length]
  }`;
  const image = `https://picsum.photos/id/${100 + index}/400/400`;

  return {
    id: String(index + 1),
    name,
    image,
  };
});
