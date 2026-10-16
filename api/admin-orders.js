const { neon } = require('@neondatabase/serverless');

function authorized(req) {
  return process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD &&
    req.headers['x-admin-username'] === process.env.ADMIN_USERNAME &&
    req.headers['x-admin-password'] === process.env.ADMIN_PASSWORD;
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'Mật khẩu quản trị không đúng.' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS chat_conversation_id VARCHAR(80)`;
      const rows = await sql`SELECT id, order_code, customer_name, customer_phone, customer_address, customer_note, items, total_amount, payment_status, order_status, chat_conversation_id, created_at FROM orders ORDER BY created_at DESC LIMIT 500`;
      return res.status(200).json({ orders: rows });
    }
    if (req.method === 'PATCH') {
      const { id, orderStatus, paymentStatus } = req.body || {};
      const allowedOrder = ['new','confirmed','shipping','completed','cancelled'];
      const allowedPayment = ['pending','paid'];
      if (!id || !allowedOrder.includes(orderStatus) || !allowedPayment.includes(paymentStatus)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
      }
      const rows = await sql`UPDATE orders SET order_status=${orderStatus}, payment_status=${paymentStatus}, updated_at=NOW() WHERE id=${Number(id)} RETURNING id`;
      return res.status(rows.length ? 200 : 404).json({ ok: !!rows.length });
    }
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Không thể tải dữ liệu đơn hàng.' });
  }
};
