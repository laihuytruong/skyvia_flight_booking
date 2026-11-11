# Kiểm tra bàn giao

- Đã kiểm tra tĩnh 60 CREATE TABLE và 8 schema.
- Đích bảng/cột của mọi REFERENCES tồn tại; không có FK vật lý xuyên service.
- Mỗi schema có inbox/outbox; mỗi màn hình 01–32 xuất hiện đúng một lần trong screen catalog.
- Đã xem bố cục 4 ảnh board. Ảnh minh họa có thể có chữ nhỏ, ngày, phép tính, logo, ghế hoặc giá không nhất quán; không dùng ảnh làm dữ liệu nghiệp vụ. SCREEN-CATALOG.md và dữ liệu server là nguồn để code.
- Chưa chạy DDL/seed trên PostgreSQL thực tế: môi trường không có PostgreSQL. Chưa kiểm thử runtime, migrations, payment/supplier hoặc AI integration. SQL cần chạy thử trên database trống trước khi dùng.
- optional-vector.sql cần pgvector được cài trên PostgreSQL, dimension phải khớp embedding model. Không bắt buộc chạy để sử dụng schema gốc.
- Đây là thiết kế và ảnh template, không phải mã nguồn ứng dụng, file Figma có layer hay vé có thể sử dụng.
