const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const products = await sql`SELECT id, slug, name, category, description, price, stock, unit, image_url FROM products WHERE is_active=TRUE ORDER BY id`;
    return res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Không thể tải sản phẩm.' });
  }
};
