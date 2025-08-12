INSERT INTO categories(name) VALUES ('Mugs'),('Shirts'),('Books')
ON CONFLICT DO NOTHING;

INSERT INTO products(name, description, price, stock_quantity, category_id, image_url)
VALUES
 ('Dev Mug', 'Ceramic mug for developers', 12.99, 50, 1, 'https://picsum.photos/seed/mug/400/300'),
 ('JS T-Shirt', 'JavaScript tee', 19.99, 100, 2, 'https://picsum.photos/seed/shirt/400/300'),
 ('Clean Code', 'Book by Robert C. Martin', 29.99, 40, 3, 'https://picsum.photos/seed/book/400/300');