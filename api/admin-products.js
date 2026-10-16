const { neon } = require('@neondatabase/serverless');
const auth = req => process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && req.headers['x-admin-username'] === process.env.ADMIN_USERNAME && req.headers['x-admin-password'] === process.env.ADMIN_PASSWORD;
const clean = value => String(value || '').trim();

module.exports = async function handler(req, res) {
  if (!auth(req)) return res.status(401).json({ error: 'Thông tin quản trị không đúng.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const products = await sql`SELECT id, slug, name, category, description, price, stock, unit, image_url, is_active, created_at, updated_at FROM products ORDER BY is_active DESC, updated_at DESC`;
      return res.status(200).json({ products });
    }
    if (req.method === 'POST') {
      const p = req.body || {};
      if (!clean(p.name) || !clean(p.category) || Number(p.price) < 0 || Number(p.stock) < 0) return res.status(400).json({ error:'Vui lòng nhập đủ tên, nhóm, giá và tồn kho.' });
      const slug = (clean(p.slug) || clean(p.name)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Date.now().toString().slice(-5);
      const imageUrl=clean(p.imageUrl);if(imageUrl.length>1600000||(!imageUrl.startsWith('data:image/')&&!imageUrl.startsWith('/assets/')))return res.status(400).json({error:'Ảnh sản phẩm không hợp lệ.'});await sql`ALTER TABLE products ALTER COLUMN image_url TYPE TEXT`;const rows = await sql`INSERT INTO products (slug,name,category,description,price,stock,unit,image_url) VALUES (${slug},${clean(p.name).slice(0,150)},${clean(p.category).slice(0,80)},${clean(p.description).slice(0,500)},${Math.round(Number(p.price))},${Math.round(Number(p.stock))},${clean(p.unit).slice(0,30)||'hộp'},${imageUrl}) RETURNING *`;
      return res.status(201).json({ product:rows[0] });
    }
    if (req.method === 'PATCH') {
      const p = req.body || {};
      if (!p.id || !clean(p.name) || Number(p.price) < 0 || Number(p.stock) < 0) return res.status(400).json({ error:'Dữ liệu sản phẩm không hợp lệ.' });
      const imageUrl=clean(p.imageUrl);if(imageUrl.length>1600000||(!imageUrl.startsWith('data:image/')&&!imageUrl.startsWith('/assets/')))return res.status(400).json({error:'Ảnh sản phẩm không hợp lệ.'});await sql`ALTER TABLE products ALTER COLUMN image_url TYPE TEXT`;const rows = await sql`UPDATE products SET name=${clean(p.name).slice(0,150)}, category=${clean(p.category).slice(0,80)}, description=${clean(p.description).slice(0,500)}, price=${Math.round(Number(p.price))}, stock=${Math.round(Number(p.stock))}, unit=${clean(p.unit).slice(0,30)||'hộp'}, image_url=${imageUrl}, is_active=${Boolean(p.isActive)}, updated_at=NOW() WHERE id=${Number(p.id)} RETURNING *`;
      return res.status(rows.length ? 200 : 404).json({ product:rows[0] });
    }
    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error:'Thiếu mã sản phẩm.' });
      const rows = await sql`UPDATE products SET is_active=FALSE, updated_at=NOW() WHERE id=${id} RETURNING id`;
      return res.status(rows.length ? 200 : 404).json({ ok:!!rows.length });
    }
    return res.status(405).json({ error:'Phương thức không được hỗ trợ' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error:'Không thể cập nhật sản phẩm.' });
  }
};
