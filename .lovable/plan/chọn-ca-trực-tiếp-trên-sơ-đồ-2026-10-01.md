# Chọn ca trực tiếp trên sơ đồ

## Thay đổi
- Đặt khu vực “Chỉnh địa chỉ hàng loạt” ngay dưới sơ đồ lịch tuần.
- Thêm chế độ chọn ca: khi bật, bấm trực tiếp vào các khối ca trên sơ đồ để chọn hoặc bỏ chọn.
- Làm nổi bật các ca đã chọn và hiển thị số lượng đang chọn.
- Giữ hành vi xem tổng quan hành trình khi không ở chế độ chọn hàng loạt.
- Sau khi chọn, nhập địa chỉ mới ngay dưới sơ đồ và áp dụng cho toàn bộ ca đã chọn.

## Chi tiết kỹ thuật
- Mở rộng `ScheduleGrid` với trạng thái chọn có kiểm soát và callback chọn ca.
- Chuyển trạng thái chọn lên trang lịch trình để sơ đồ và khu vực chỉnh địa chỉ dùng chung.
- Loại bỏ danh sách nút ca trùng lặp khỏi khu vực chỉnh địa chỉ cũ.
