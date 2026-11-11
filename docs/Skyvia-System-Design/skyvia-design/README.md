# Skyvia — thiết kế hệ thống đặt vé máy bay có chatbot AI

Ngày thiết kế: 11/11/2026. Công nghệ mục tiêu: NestJS microservices, React + TypeScript, PostgreSQL.

Đây là bộ thiết kế để bắt đầu triển khai, chưa phải ứng dụng chạy hoàn chỉnh hay tích hợp xuất vé thật.

## Đọc theo thứ tự

1. `SYSTEM-DESIGN.md`: phạm vi, kiến trúc, công nghệ, luồng nghiệp vụ, chatbot, API và lộ trình.
2. `SCREEN-CATALOG.md`: đặc tả 32 màn hình, route, thành phần và trạng thái cần có.
3. `DATABASE-DICTIONARY.md`: toàn bộ bảng, cột, kiểu dữ liệu và ràng buộc.
4. `RELATIONS.md`: quan hệ vật lý trong service và tham chiếu logic giữa service, sơ đồ Mermaid.
5. `schema.sql`: DDL nền tảng PostgreSQL; `seed.sql`: dữ liệu danh mục mẫu.
6. `optional-vector.sql`: bổ sung pgvector khi triển khai RAG, không bắt buộc với DDL gốc.

Mở `index.html` để đọc toàn bộ tài liệu và xem ảnh trực tiếp. Thư mục `images/` chứa 4 ảnh template theo nhóm. Mỗi ảnh gồm 8 màn hình desktop; SCREEN-CATALOG.md là nguồn chính xác cho route, nhãn, trường và trạng thái. Ảnh là tham khảo thiết kế; các hàng dữ liệu và biểu đồ trong ảnh chỉ là dữ liệu minh họa.

## Cách dùng schema

Tạo một database PostgreSQL trống cho môi trường thiết kế, rồi chạy:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f seed.sql
```

DDL có transaction, không có DROP và không thiết kế để chạy lặp. Mỗi schema là một miền sở hữu dữ liệu; dùng chung instance ở local giúp giảm chi phí. Production cần role riêng, migration riêng và chỉ service chủ sở hữu có quyền truy cập schema đó. Khi tách database vật lý, giữ nguyên ID logic và hợp đồng API/event; không có foreign key giữa service.

Schema không tạo role/mật khẩu, không cấu hình broker hoặc tích hợp nhà cung cấp. Migrations thực tế phải chia theo service, kèm kiểm thử và chiến lược triển khai. Không đưa DATABASE_URL hay API key thật vào repository.
