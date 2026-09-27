# GoFlow: Your Smart Commute

Hãy xây dựng ứng dụng Web App hoàn chỉnh có tên "GoFlow - Nhắc bạn đúng hẹn" - Quản lý lịch trình và đo lường kẹt xe thời gian thực tại Hà Nội, tối ưu deploy lên Vercel.

1. BẢNG MÀU THIẾT KẾ & FONT CHỮ:

- Font chữ: Tích hợp Google Font "Quicksand" cho toàn bộ ứng dụng (font chữ tròn trịa, nét đậm hiện đại, cực kỳ thân thiện).

- Màu chủ đạo Xanh Sapphire (#0F52BA hoặc #1D4ED8): Thanh Navbar, tiêu đề chính, nút bấm hành động (Primary buttons).

- Màu phối Baby Blue Pastel (#E0F2FE hoặc #BAE6FD): Nền thẻ phụ, viền bo tròn, các khối thời gian trên lịch.

- Màu nền web: Trắng tinh khiết (#FFFFFF) kết hợp hiệu ứng gradient loang nhẹ màu Baby Blue dịu mát (#F0F9FF).

- Tiêu đề thương hiệu trên Header / Hero:

  + Tên: "GoFlow - Nhắc bạn đúng hẹn"

  + Khẩu hiệu nổi bật (Font Quicksand bo tròn, in đậm, màu Sapphire): "Tối ưu di chuyển, tận hưởng hành trình"

- Thiết kế chuẩn Mobile-first, bo góc tròn mềm mại (rounded-3xl).

2. CẤU HÌNH API KEYS CHẠY THẬT (Lưu ngầm, TUYỆT ĐỐI KHÔNG hiện ô nhập key ra màn hình người dùng):

- TomTom API Key: gvmI8Uel6GuwZw2ot0aEiPPGYwEWxX1k

- Google Gemini API Key: AQ.Ab8RN6LxkwfY0sLILX2e8hhmYZWtJeGtnMkwGLm8m6CDaqVdOQ

3. XỬ LÝ ĐỊA CHỈ, SỐ NHÀ & GỢI Ý TÌM KIẾM (AUTOCOMPLETE):

- Ô tìm kiếm duy nhất (KHÔNG CẦN CÁC NÚT CHỌN QUẬN): Cho phép nhập đầy đủ số nhà, ngõ, ngách, tên đường tại Hà Nội (Ví dụ: "261 trần quốc hoàn, cầu giấy").

- CHỐNG LỖI 400: Bắt buộc dùng `encodeURIComponent(query + ", Hà Nội, Việt Nam")` khi gọi TomTom Search API.

- TỰ ĐỘNG GỢI Ý (AUTOCOMPLETE DROPDOWN): Khi người dùng gõ từ 2 ký tự trở lên, hiển thị danh sách thả xuống gợi ý các địa chỉ phù hợp tại Hà Nội. Bấm vào gợi ý nào -> Tự động điền vào ô tìm kiếm, di chuyển ghim bản đồ và bay bản đồ (map.flyTo) đến đúng toạ độ đó ngay lập tức.

- NÚT "LẤY GPS HIỆN TẠI": Khi bấm vào -> Lấy toạ độ thực tế của thiết bị, di chuyển ghim bản đồ về đó, đồng thời gọi TomTom Reverse Geocode để dịch toạ độ thành tên đường cụ thể và ĐIỀN THẲNG VÀO Ô TÌM KIẾM.

- Cho phép người dùng chạm/click trực tiếp lên bản đồ để cắm ghim đúng nóc nhà mình.

- QUY TẮC: Giữ nguyên vẹn 100% văn bản số nhà người dùng đã gõ, không tự ý xoá.

4. BẢN ĐỒ KẸT XE VỆ TINH REAL-TIME (TOMTOM TRAFFIC FLOW LAYER):

- Tích hợp bản đồ Leaflet:

  + Bản đồ khu vực Hà Nội.

  + KÍCH HOẠT LỚP PHỦ GIAO THÔNG VỆ TINH THẬT: Thêm TomTom Traffic Flow Tile Layer trực tiếp qua URL:

    `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=gvmI8Uel6GuwZw2ot0aEiPPGYwEWxX1k`

    -> Các trục đường tại Hà Nội sẽ tự động hiển thị vệt màu thời gian thực: 🔴 Đỏ (Tắc nghẽn nghiêm trọng), 🟠 Cam (Ùn ứ), 🟢 Xanh lá (Thông thoáng). Đây là dữ liệu vệ tinh GPS thật 100%.

  + Tuyến đường dẫn hướng (Route Polyline): Gọi TomTom Routing API vẽ đường nối từ vị trí nơi ở đến điểm hẹn bằng dải màu Xanh Sapphire nổi bật.

  + Thẻ chú thích nhỏ xinh ở góc bản đồ: 🔴 Tắc nghẽn • 🟠 Ùn ứ • 🟢 Thông thoáng.

5. THẺ REALTIME & BỘ ĐẾM GIỜ VÀNG XUẤT PHÁT:

- Hiển thị ca học / ca làm việc sắp tới gần nhất.

- BỘ CHỌN PHƯƠNG TIỆN (4 nút bo tròn xinh xắn):

  + 🛵 Xe máy (Đệm gửi xe: 5 phút)

  + 🚗 Ô tô / Taxi (Đệm tìm bãi đỗ: 15 phút, tính thêm thời gian kẹt xe)

  + 🚇 Bus / Tàu điện trên cao (Đệm đi bộ & chờ tàu: 10 phút)

  + 🚶 Đi bộ

  -> Bấm đổi phương tiện: Tự động tính toán lại Giờ xuất phát và vẽ lại lộ trình ngay lập tức.

- Trạng thái tải tinh tế: Khi đang tính toán, hiển thị thông báo nhẹ nhàng: "Đang kiểm tra lưu lượng giao thông Hà Nội..." (Tuyệt đối không hiển thị câu thô "Đang tính lộ trình thật từ TomTom...").

- Đồng hồ đếm lùi: "Bạn cần xuất phát sau: [XX] Phút" (Kèm giờ cần bước chân ra khỏi nhà).

6. TRANG LỊCH TRÌNH - DẠNG BẢNG MA TRẬN THEO GIỜ (TIME-GRID MATRIX):

- THIẾT KẾ DẠNG BẢNG MA TRẬN THỜI GIAN TRỰC QUAN:

  + Cột ngang: Thứ 2 đến Chủ Nhật.

  + Cột dọc: Các mốc giờ từ 07:00 đến 21:00.

  + Các ca học / ca làm việc được hiển thị dưới dạng các KHỐI MÀU (Color Blocks) nằm chính xác theo độ dài khung giờ diễn ra (Ví dụ: Ca học 07:30 - 09:10 sẽ chiếm đúng độ cao tương ứng giữa mốc 7h và 9h).

  + Khối lịch học có màu Xanh Sapphire nhạt viền đậm, ca làm thêm có màu Baby Blue viền đậm.

- NẠP LỊCH ĐA ĐỊNH DẠNG:

  + 📷 Quét ảnh TKB thật (gửi ngầm đến Gemini 1.5 Flash API bóc tách JSON đưa vào lịch).

  + 📊 Tải file Excel (.xlsx, .xls) hoặc file CSV.

  + Có nút tải file mẫu Excel.

7. HỆ THỐNG TÀI KHOẢN & ĐÁNH GIÁ (FEEDBACK LOOP):

- Nút "Đăng nhập / Đăng ký" và Nút "ĐĂNG NHẬP NHANH DEMO 1-CLICK" ở góc phải thanh Navbar.

- Mỗi người dùng có nơi ở riêng và lịch biểu riêng biệt.

- Danh sách các chuyến đi trong ngày kèm nút đánh giá 1-5 sao ("Đúng giờ", "Bị trễ") để lưu lại tối ưu cho các chuyến sau.

Dữ liệu mặc định ban đầu:

- Nơi ở: "Số 15 ngõ 137 Phùng Khoang, Trung Văn, Nam Từ Liêm, Hà Nội"

- Điểm đến: "Đại học Bách Khoa Hà Nội" (Môn Giải Tích 2 lúc 07:30).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://goflow-realtime-hanoi.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c115a12-144f-4ce8-a328-51db604d65c4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
