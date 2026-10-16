const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  try {
    const { customerName, customerPhone, customerAddress, customerNote = '', conversationId = '', items } = req.body || {};
    if (!customerName || !customerPhone || !customerAddress || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin nhận hàng và chọn ít nhất một sản phẩm.' });
    }
    if (!/^[0-9+\s.-]{8,16}$/.test(customerPhone)) {
      return res.status(400).json({ error: 'Số điện thoại chưa đúng định dạng.' });
    }
    const sql = neon(process.env.DATABASE_URL);
    const requested = items.slice(0, 30).map(item => ({ id:Number(item.id), quantity:Math.min(99,Math.max(1,Number(item.quantity)||1)) })).filter(item=>item.id);
    const ids = requested.map(item=>item.id);
    const dbProducts = await sql`SELECT id,name,price,stock,is_active FROM products WHERE id = ANY(${ids})`;
    const normalizedItems = requested.map(item => { const p=dbProducts.find(row=>Number(row.id)===item.id); return p ? {id:item.id,name:p.name,price:p.price,quantity:item.quantity,stock:p.stock,isActive:p.is_active} : null }).filter(Boolean);
    if (normalizedItems.length !== requested.length || normalizedItems.some(item=>!item.isActive || item.quantity>item.stock)) return res.status(409).json({ error:'Một sản phẩm đã hết hàng hoặc ngừng bán. Vui lòng tải lại giỏ.' });
    const total = normalizedItems.reduce((sum,item)=>sum+item.price*item.quantity,0);
    const orderItems = normalizedItems.map(({id,name,price,quantity})=>({id,name,price,quantity}));
    const code = `CC${Date.now().toString().slice(-9)}`;
    const chatId = String(conversationId || `order-${code}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS chat_conversation_id VARCHAR(80)`;
    await sql`CREATE TABLE IF NOT EXISTS chat_messages (id BIGSERIAL PRIMARY KEY, conversation_id VARCHAR(80) NOT NULL, sender VARCHAR(20) NOT NULL CHECK (sender IN ('customer','seller')), customer_name VARCHAR(120), customer_phone VARCHAR(30), message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    const rows = await sql`INSERT INTO orders (order_code, customer_name, customer_phone, customer_address, customer_note, items, total_amount, chat_conversation_id)
      VALUES (${code}, ${String(customerName).slice(0, 120)}, ${String(customerPhone).slice(0, 30)}, ${String(customerAddress).slice(0, 500)}, ${String(customerNote).slice(0, 500)}, ${JSON.stringify(orderItems)}, ${total}, ${chatId})
      RETURNING order_code, total_amount, order_status, payment_status, created_at, chat_conversation_id`;
    await sql`INSERT INTO chat_messages (conversation_id, sender, customer_name, customer_phone, message) VALUES (${chatId}, 'seller', ${String(customerName).slice(0,120)}, ${String(customerPhone).slice(0,30)}, ${`Cút Cút đã nhận đơn ${code}. Bạn có thể nhắn tin với cửa hàng ngay tại đây.`})`;
    for (const item of normalizedItems) await sql`UPDATE products SET stock=stock-${item.quantity}, updated_at=NOW() WHERE id=${item.id} AND stock>=${item.quantity}`;
    return res.status(201).json({ order: rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Chưa thể tạo đơn. Vui lòng thử lại.' });
  }
};
