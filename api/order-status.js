const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  const code = String(req.query.code || '').trim().toUpperCase().slice(0, 30);
  const phone = String(req.query.phone || '').replace(/\D/g, '').slice(0, 20);
  if (!code || phone.length < 8) return res.status(400).json({ error: 'Vui lòng nhập mã đơn và số điện thoại.' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT order_code, items, total_amount, order_status, payment_status, created_at, updated_at FROM orders WHERE UPPER(order_code)=${code} AND regexp_replace(customer_phone, '[^0-9]', '', 'g')=${phone} LIMIT 1`;
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đơn. Hãy kiểm tra lại mã đơn và số điện thoại.' });
    return res.status(200).json({ order: rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Chưa thể cập nhật trạng thái đơn hàng.' });
  }
};
