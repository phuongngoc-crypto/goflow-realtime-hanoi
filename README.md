# GOFLOW - NỀN TẢNG THEO DÕI VÀ ĐIỀU PHỐI GIAO THÔNG REALTIME HÀ NỘI

> **Đồ án môn học:** Lập trình cho Phân tích dữ liệu và Tính toán khoa học  
> **Khoa Công nghệ & Khoa học Dữ liệu – Trường Đại học Ngoại Thương**  
> **Giảng viên hướng dẫn:** TS. Trần Công Minh  

---

## Giới thiệu dự án
**GoFlow** là giải pháp công nghệ hỗ trợ người tham gia giao thông tại Thủ đô Hà Nội theo dõi tình trạng ùn tắc theo thời gian thực (realtime), tìm kiếm lộ trình di chuyển tối ưu và giảm thiểu thời gian di chuyển trong các khung giờ cao điểm.

## Tính năng chính
- **Bản đồ giao thông trực quan:** Hiển thị mật độ phương tiện và các điểm nghẽn tại các nút giao trọng điểm Hà Nội.
- **Cập nhật dữ liệu Realtime:** Đồng bộ liên tục tình trạng luồng xe.
- **Gợi ý lộ trình thông minh:** Hỗ trợ người dùng lựa chọn tuyến đường thông thoáng nhất.
- **Giao diện tối ưu:** Thiết kế theo triết lý Mobile-first, thân thiện và phản hồi nhanh chóng.

## Công nghệ sử dụng (Tech Stack)
- **Frontend:** React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Routing & Architecture:** TanStack, Vite
- **Database & Backend:** Supabase (PostgreSQL), Serverless Functions
- **Deployment:** Vercel / Cloud Infrastructure

## Hướng dẫn chạy thử trên môi trường nội bộ (Local)

1. Clone mã nguồn về máy:
\`\`\`bash
git clone https://github.com/phuongngoc-crypto/goflow-realtime-hanoi.git
cd goflow-realtime-hanoi
\`\`\`

2. Cài đặt các thư viện phụ thuộc:
\`\`\`bash
npm install
\`\`\`

3. Khởi chạy ứng dụng ở chế độ phát triển:
\`\`\`bash
npm run dev
\`\`\`
Mở trình duyệt tại: `http://localhost:5173`
