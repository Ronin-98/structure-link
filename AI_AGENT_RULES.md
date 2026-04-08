# AI Agent Rules - Project Mapping

Nhằm mục đích tránh phình to context window cho Agent, dự án này không sử dụng file văn bản thông thường để ghi nhận log kiến trúc như trước đây. Thay vào đó, dự án quản lý cấu trúc thông qua một file JSON duy nhất: `project-map.json`.

Khi AI tiến hành **thêm mới, chỉnh sửa hàm** hoặc **tạo file mới**, AI **TUYỆT ĐỐI BẮT BUỘC** phải gọi ứng dụng (tool CLI) cài sẵn trong dự án để hệ thống tự động cập nhật lại map dự án. Không được trực tiếp ghép vào prompt hay chỉnh sửa JSON thủ công trừ khi có lý do chính đáng.

## CÁCH GỌI (TERMINAL COMMAND)

Thực thi lệnh sau thông qua tool `run_command` trên terminal:

```bash
npm run map:update -- --file "<đường_dẫn_file>" --module "<tên_module>" --func "<tên_hàm>" --purpose "<mục_đích_ngắn_gọn>" --deps "<dep1,dep2,...>"
```

### Giải thích tham số:
- `--file`: Đường dẫn tới file chứa code mới (vd: `src/services/userService.ts`). Bắt buộc.
- `--module`: Tên phân hệ hoặc logic module (vd: `User`, `Auth`, `Core`).
- `--func`: Tên của hàm, class hoặc method vừa tạo (vd: `loginUser`). Bắt buộc.
- `--purpose`: Công dụng của đoạn code này (vd: "Xử lý đăng nhập bằng JWT"). Bắt buộc.
- `--deps`: Danh sách các package hoặc thư viện bên ngoài sử dụng trong hàm, cách nhau bằng dấu phẩy (vd: `bcrypt,jsonwebtoken`). Nếu không có thì bỏ qua cờ này.

## VÍ DỤ THỰC TẾ

Sau khi AI viết mã cho hàm `calculateTotal` tại `src/utils/math.ts`:

```bash
npm run map:update -- --file "src/utils/math.ts" --module "Utils" --func "calculateTotal" --purpose "Tính tổng giá trị đơn hàng"
```

## Báo cáo lại cho người dùng:
Cuối bước phản hồi, hãy báo cáo: "Tôi đã mã hoá xong và đã gọi lệnh `npm run map:update` để cập nhật trạng thái lên `project-map.json`."
