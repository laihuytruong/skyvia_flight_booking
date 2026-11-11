BEGIN;
INSERT INTO identity.roles(code,name) VALUES ('CUSTOMER','Khách hàng'),('SUPPORT','Chăm sóc khách hàng'),('ADMIN','Quản trị');
INSERT INTO identity.permissions(code,description) VALUES ('booking:read:self','Xem vé bản thân'),('booking:read:any','Xem vé khách hàng theo nhiệm vụ'),('booking:change:any','Xử lý đổi/hủy'),('refund:approve','Duyệt hoàn tiền'),('iam:manage','Quản lý quyền'),('knowledge:publish','Xuất bản tri thức');
INSERT INTO identity.role_permissions(role_id,permission_id) SELECT r.id,p.id FROM identity.roles r CROSS JOIN identity.permissions p WHERE r.code='ADMIN' OR (r.code='CUSTOMER' AND p.code='booking:read:self') OR (r.code='SUPPORT' AND p.code IN ('booking:read:any','booking:change:any'));
INSERT INTO flight.airports(iata,name,city,country_code,timezone) VALUES ('HAN','Nội Bài','Hà Nội','VN','Asia/Ho_Chi_Minh'),('SGN','Tân Sơn Nhất','TP Hồ Chí Minh','VN','Asia/Ho_Chi_Minh'),('DAD','Đà Nẵng','Đà Nẵng','VN','Asia/Ho_Chi_Minh');
INSERT INTO flight.airlines(iata,name) VALUES ('VN','Vietnam Airlines'),('VJ','Vietjet Air');
INSERT INTO flight.suppliers(code,name,mode,enabled) VALUES ('MOCK','Local demonstration provider','MOCK',true);
INSERT INTO flight.routes(origin_id,destination_id) SELECT a.id,b.id FROM flight.airports a CROSS JOIN flight.airports b WHERE a.id<>b.id;
COMMIT;
