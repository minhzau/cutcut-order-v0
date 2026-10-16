# CutCut Order

Website đặt hàng: https://cutcut-order-v0.vercel.app/

Frontend HTML/CSS/JavaScript; API Node.js chạy trên Vercel Functions; PostgreSQL dùng Neon.

## Triển khai

Import repository vào Vercel, framework Other, không có build command. Giữ thư mục gốc làm Root Directory. Cấu hình các biến môi trường trong Vercel:

- `DATABASE_URL`: chuỗi kết nối PostgreSQL.
- `ADMIN_USERNAME`: tên đăng nhập quản trị.
- `ADMIN_PASSWORD`: mật khẩu quản trị.

Không đưa giá trị bí mật vào GitHub. Những giá trị đang dùng trên deployment hiện tại không nằm trong repository này. GitHub Pages không chạy các API trong `api/`.

## Cấu trúc

- `index.html`: trang khách hàng.
- `admin.html`: giao diện quản trị.
- `api/`: sản phẩm, đơn hàng, tra cứu, chat và cuộc gọi.
- `assets/`: hình ảnh giao diện.

Chạy phát triển bằng Vercel CLI (`vercel dev`) sau khi cài dependency với `npm install` và cấu hình môi trường riêng.
