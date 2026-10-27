# 👑 HỆ THỐNG KHO & QUẢN LÝ VIDEO - BẢO MẬT MÃ PIN RIÊNG BIỆT (TƯỜNG VY ADMIN)

Hệ thống quản lý video chuyên nghiệp toàn màn hình, được trang bị **cơ chế bảo mật đăng nhập bắt buộc bằng Mã PIN riêng biệt cho từng người**. Tất cả tài khoản và mã PIN đều do **Quản trị viên Tường Vy** kiểm soát và cấp phát trực tiếp bên trong phần mềm.

---

## 🔒 BẢO MẬT & MÃ PIN BAN ĐẦU CỦA TỪNG NGƯỜI

Khi bất kỳ ai (Sếp, Nhân viên hoặc Tường Vy) mở link phần mềm trên trình duyệt, màn hình đăng nhập bảo mật sẽ hiện lên **bắt buộc chọn tài khoản và nhập đúng mã PIN riêng**.

| Tài Khoản | Vai Trò | Mã PIN Mặc Định | Quyền Hạn Trong Hệ Thống |
|---|:---:|:---:|---|
| **👑 Tường Vy (Admin)** | **Quản Trị Tối Cao** | **`123456`** | Toàn quyền quản trị, thêm/bớt người, cấp đổi mã PIN của tất cả mọi người, xóa bất kỳ video nào |
| **👔 Sếp (Chỉ xem)** | **Giám Đốc / Sếp** | **`8888`** | **Chỉ có quyền XEM video** trên màn hình lớn. Tuyệt đối không thể thêm, sửa, xóa hay đổi kênh đăng |
| **🎬 Hoàng Nam** | **Nhân viên dựng** | **`1111`** | Thêm video, upload file, cập nhật trạng thái kênh đăng của mình (không có quyền xóa) |
| **🎬 Thảo Linh** | **Nhân viên dựng** | **`2222`** | Thêm video, upload file, cập nhật trạng thái kênh đăng của mình (không có quyền xóa) |
| **🎬 Minh Tuấn** | **Nhân viên dựng** | **`3333`** | Thêm video, upload file, cập nhật trạng thái kênh đăng của mình (không có quyền xóa) |

---

## 🛡️ TƯỜNG VY QUẢN LÝ & CẤP MÃ PIN NHƯ THẾ NÀO?

Chỉ duy nhất **Tường Vy** đăng nhập bằng mã PIN Admin (`123456`) mới nhìn thấy nút **"Quản Lý Nhân Sự & PIN"** ở thanh trên cùng. Tại đây Tường Vy có thể:

1. **Xem mã PIN hiện tại của tất cả mọi người:**
   - Mỗi người đều có mã PIN hiển thị rõ ràng kèm nút **Sao chép** để Tường Vy chỉ cần 1 click là có thể gửi qua Zalo/tin nhắn cho Sếp hoặc nhân viên.
2. **Đổi mã PIN cho bất kỳ ai:**
   - Bấm nút **"Đổi PIN"** bên cạnh tên người đó, nhập mã PIN mới (ví dụ: đổi PIN của Sếp thành `9999`) và lưu lại ngay lập tức.
3. **Đổi vai trò giữa Sếp và Nhân viên:**
   - Bấm nút **"Đổi quyền"** để chuyển đổi quyền hạn giữa *Chỉ xem video* và *Được thao tác dựng*.
4. **Thêm người dùng mới:**
   - Nhập tên + chọn vai trò + tự đặt mã PIN cho người đó.
5. **Xóa người dùng:**
   - Xóa các tài khoản nhân viên khi cần.

---

## 🚫 TẠI SAO SẾP KHÔNG THỂ VÀO PHẦN CỦA NHÂN VIÊN?

- Sếp chỉ được Tường Vy cung cấp mã PIN của riêng Sếp (ví dụ `8888`).
- Khi Sếp nhập mã PIN `8888`, hệ thống nhận diện đây là vai trò **Chỉ Xem Video (Boss)** và **tự động khóa và ẩn toàn bộ các nút Thêm video, Sửa video, Xóa video và Đổi kênh đăng**.
- Sếp không biết mã PIN của các bạn nhân viên (`1111`, `2222`, `3333`) hay mã PIN của Tường Vy (`123456`) nên **hoàn toàn không thể đăng nhập vào tài khoản của nhân viên hay quản trị viên**.

---

## 🚀 CÁCH KHỞI ĐỘNG (1-CLICK)

1. Mở thư mục [`c:\Users\Admin\Downloads\PHẦN MỀM VY`](file:///c:/Users/Admin/Downloads/PHẦN%20MỀM%20VY).
2. Nhấp đúp chuột vào file:
   👉 **`Chay_Phan_Mem.bat`**
3. Trình duyệt web sẽ tự động mở trang phần mềm tại:
   👉 **`http://localhost:8000`**
4. Để gửi cho Sếp hoặc nhân viên mở trên máy khác qua Wi-Fi nội bộ:
   - Gửi đường link mạng LAN hiển thị trên đầu trang (ví dụ: `http://192.168.110.163:8000`).
   - Cung cấp cho người đó mã PIN riêng của họ.
