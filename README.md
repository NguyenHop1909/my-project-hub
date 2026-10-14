# My Project Hub

Hub cá nhân để quản lý, tìm kiếm và truy cập toàn bộ website/dự án từ một nơi. Ứng dụng chạy được trực tiếp trên web và dưới dạng desktop `.exe` cho Windows.

## Tính năng

- Thêm, sửa, xóa và đánh dấu website yêu thích
- Tìm kiếm, lọc theo danh mục và trạng thái
- Lưu dữ liệu cục bộ trên thiết bị
- Nhập/xuất dữ liệu JSON để sao lưu
- Giao diện sáng/tối, responsive cho desktop và mobile
- Desktop app dùng Electron, mở liên kết an toàn bằng trình duyệt mặc định

## Chạy bản web

Mở `index.html` trực tiếp hoặc chạy:

```bash
npm install
npm run dev
```

## Chạy và đóng gói bản desktop

```bash
npm install
npm run desktop
npm run dist
```

## Cap nhat tu dong

Ban desktop tu dong kiem tra GitHub Releases khi khoi dong. Khi ban moi da tai xong,
ung dung se hoi nguoi dung co muon khoi dong lai de cap nhat hay khong. Moi release
can kem file cai dat `.exe`, `latest.yml` va file `.blockmap` do electron-builder tao ra.

## Uptime monitor

- Tu dong kiem tra cac website moi 60 giay va co nut kiem tra ngay.
- Hien thi Online/Failed, HTTP status, do tre va thoi diem kiem tra gan nhat.
- Canh bao khi mot website dang online chuyen sang mat ket noi.
- Ban desktop ping qua Electron nen doc duoc HTTP status chinh xac; ban web kiem tra kha nang ket noi va bi gioi han boi CORS cua trinh duyet.

File `.exe` được tạo trong thư mục `release/`.

## Dữ liệu

Dữ liệu được lưu trong `localStorage` của trình duyệt hoặc Electron. Dùng nút **Xuất dữ liệu** để sao lưu trước khi đổi máy hoặc xóa dữ liệu ứng dụng.
