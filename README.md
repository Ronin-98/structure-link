# Project Map Tools - Hướng Dẫn Sử Dụng

Bộ công cụ này giúp các dự án giải quyết vấn đề "phình to ngữ cảnh (context window)" của AI Agent, đồng thời cung cấp một bản đồ cấu trúc project (`project-map.json`) chính xác vĩnh viễn với nỗ lực thủ công bằng không.

Bằng cách sử dụng cơ chế AST Parsing và CLI Argument Injection, AI làm việc trong dự án có thể ghi danh các hàm tạo mới vào file JSON chuẩn, hoặc tự động quét lại toàn bộ code bằng `ts-morph` mà không cần phải dán text vào prompt.

---

## Cài đặt cho dự án thực tế MỚI

Khi mang bộ công cụ này sang một dự án thực tế khác, hãy làm đúng 3 thao tác thiết lập 1-lần sau:

### 1. Cài đặt các thư viện nền
Mở Terminal tại thư mục gốc dự án của bạn và chạy:
```bash
npm i -D ts-morph ts-node
```

### 2. Tích hợp Source code công cụ
- Copy thư mục chứa file `map-generator.ts` và `map-updater.ts` vào dự án thực.
- Nên ưu tiên để vào thư mục như: `src/tools/` hoặc `scripts/`.

### 3. Cấu hình Registry Commands
Mở file `package.json` của dự án và khai báo 2 script command sau:
```json
"scripts": {
  "map:generate": "ts-node src/tools/map-generator.ts",
  "map:update": "ts-node src/tools/map-updater.ts"
}
```

---

## Cách vận hành trong vòng đời dự án

### Tình huống 1: Thiết lập cấu trúc sơ khởi (Map Baseline)
Dự án của bạn đã code trước đó, có khi đến hàng trăm tệp, và bạn muốn thiết lập `project-map.json` một cách toàn diện? 

**Chạy lệnh CLI:**
```bash
npm run map:generate
```
**Chuyện gì sẽ xảy ra?**
- Lệnh này sẽ chạy ngầm định tự động tìm các file TypeScript.
- Quét và bóc tách các Class, Method, và Function (hàm).
- Trích xuất Dependencies nhờ phân tích các lệnh `import` cục bộ ở đầu file.
- Gắn công dụng vào map dựa trên JSDoc Comment (`/** Giải thích hàm */`) mà bạn rải khắp code.
- Ghi đè cấu trúc map cũ (nếu có).

### Tình huống 2: Code Tự hành bởi Agent (Luồng Agentic Code)
Bạn muốn đưa project này cho các AI (như Claude, GPT, Cursor, Cline) hỗ trợ viết mã tự động.

1. Bạn buộc phải cấp cho AI rule (Quy tắc) được trích từ nội dung **`AI_AGENT_RULES.md`**. (Dán Rule này vào `.cursorrules`, file Prompt mồi hằng ngày, hoặc Instruction gốc).
2. Khi AI sáng tạo logic và thêm hàm mới, quy tắc sẽ ép AI **KHÔNG** loằng ngoằng trong cửa sổ chat mà phải kích hoạt ngầm lệnh update.
3. AI sẽ tự động gõ vào Terminal:
   ```bash
   npm run map:update -- --file "src/modules/payment.ts" --module "Billing" --func "chargeCard" --purpose "Gửi req trừ tiền từ Stripe" --deps "stripe"
   ```
4. `project-map.json` tự động được nạp lại thông tin hàm mới này gọn gàng nhất có thể.

---

## Mẹo Nâng Cao: Viết Code vì Bản đồ (Write for Map)
Nếu dự án của bạn đang được xây dựng song song giữa Lập trình viên và AI, hãy nhớ bồi dưỡng thói quen sử dụng JSDoc cho mọi Method/Class.
Bởi `map-generator.ts` rất thông minh, bất cứ khi nào code bị mất đồng bộ lớn, bạn chạy lại thủ công `npm run map:generate`, mọi comment theo định dạng:

...sẽ trở thành mục `purpose` sáng bóng nằm bên trong `project-map.json`.

---

## Giải pháp cho Kiến trúc Tách rời (Ví dụ: Frontend & Backend riêng biệt)

Khi dự án của bạn có thư mục Frontend (React/Vue) và Backend (Node/Express) tách biệt (không phải dạng Monorepo chuẩn), cách tốt nhất để AI Agent hoạt động trơn tru là **"Chia để trị" (Mỗi bên một bản đồ)**:

### 1. Phân bổ Map Độc lập
- **Thực hiện Setup 2 lần:** Bạn mang thư mục `src/tools/` sao chép vào cả thư mục gốc của Backend và Frontend.
- **Chạy `map:generate` 2 lần:** Đứng ở mỗi thư mục chạy lệnh này. Kết quả là bạn sẽ có `backend/project-map.json` và `frontend/project-map.json`.
- **Lý do:** Công nghệ và file `tsconfig.json` của FE và BE khác nhau. Tách ra giúp công cụ Quét AST (`ts-morph`) của mỗi bên hoạt động chuẩn xác 100%.

### 2. Tư duy "Giao tiếp Context" của AI
AI Agent (đặc biệt khi mở trên một Workspace ngang hàng chứa cả FE và BE) đủ thông minh để đọc bản đồ chéo nhau:
- Khi đang viết code ở Frontend và cần gọi API Backend, AI chỉ cần lướt qua tệp `backend/project-map.json` dạng text tĩnh.
- Nhờ tìm kiếm mục `purpose` trong file JSON của Backend, AI lập tức biết được Service nào đảm nhiệm việc gì (Ví dụ tìm thấy `chargeCard` ở `payment.ts`).
- Nó quay lại FE viết code Axios tương ứng và dùng lệnh `npm run map:update` của chính FE để lưu lại vết.

### 3. Mẹo Rules Bổ sung:
Để ép AI luôn nhớ làm điều này, bạn có thể bổ sung quy ước nhỏ vào file `AI_AGENT_RULES.md` ở mỗi bên:
> *"Nếu tính năng ở Frontend cần gọi API, hãy đọc file `../backend/project-map.json` trước để biết chính xác tên Endpoint/Service."*

---

## Dành riêng cho Agent "Antigravity & Gemini 3.1" (Thiết lập tự động hóa 100%)

Nếu bạn đang sử dụng hệ sinh thái nâng cao như **Antigravity** (chạy lõi Gemini 3.1), bạn có một đặc quyền là không cần phải kéo dán prompt bất kì lúc nào. Chỉ cần làm một trong các bước sau:

### Cách 1: Sử dụng "Custom Rules" (Khuyên Dùng Nhất)
1. Mở Cài đặt (**Settings**) của giao diện Antigravity.
2. Tìm đến mục **Custom Rules** (Quy tắc người dùng).
3. Copy toàn bộ văn bản trong file `AI_AGENT_RULES.md` và dán thẳng vào ô văn bản đó.
4. Xong! Hệ thống sẽ tự động đem tiêm ngầm bộ quy luật này vào trí não của AI trên **Tất cả các phiên trò chuyện** (Converzations) của mọi dự án về sau. AI sẽ mặc định cập nhật map bằng CLI.

### Cách 2: Thiết lập Workflow tự động
1. Tạo thư mục ẩn: `.agents/workflows/` (hoặc `_agents/workflows/`) tại gốc dự án.
2. Tạo file `update-project-map.md` cài cắm rule vào trong đó.
3. Antigravity có tính năng quét Workflow nội sinh, nó sẽ tự động coi đây là quy trình chuẩn của dự án và làm theo.

### Cách 3: Lệnh chú ý cục bộ (Chỉ dùng lần đầu)
Nếu bạn lười thiết lập vào cấu hình lõi, tại câu lệnh đầu tiên (First Prompt) của giao diện Antigravity khi mở một phiên hội thoại mới, hãy đính kèm tệp gốc hoặc gõ rõ ràng: 
*"Hãy tuân thủ quy tắc ở tệp `AI_AGENT_RULES.md` nhé. Chức năng tôi muốn là..."*
Hệ thống Antigravity có bộ đọc file tự động ngay thềm tiếp nhận, nó sẽ nạp tệp này và khắc cốt ghi tâm quy tắc cho tới khi đoạn chat đó đóng lại định lý.
