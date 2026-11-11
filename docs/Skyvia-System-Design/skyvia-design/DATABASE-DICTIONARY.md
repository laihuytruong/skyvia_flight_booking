# Database dictionary

60 bảng trong 8 schema. Trong đó 16 bảng inbox/outbox hạ tầng (2 bảng mỗi service); còn lại là bảng nghiệp vụ.

Mọi `*_id` bên ngoài schema sở hữu là tham chiếu logic, trừ REFERENCES được ghi rõ. Tiền dùng bigint theo đơn vị nhỏ nhất của currency: VND = đồng; không dùng float. `timestamptz` lưu thời điểm; timezone IANA quyết định hiển thị. JSON không thay thế các khóa quan hệ cốt lõi.

## identity.users

Tài khoản; email được chuẩn hóa lowercase trước khi ghi.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `email` | `text NOT NULL UNIQUE CHECK (email = lower(email))` |
| `password_hash` | `text` |
| `full_name` | `text NOT NULL` |
| `phone` | `text` |
| `status` | `text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','BLOCKED','DELETED'))` |
| `email_verified_at` | `timestamptz` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

## identity.roles

Vai trò hệ thống.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `code` | `text NOT NULL UNIQUE` |
| `name` | `text NOT NULL` |

## identity.permissions

Quyền theo hành động.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `code` | `text NOT NULL UNIQUE` |
| `description` | `text NOT NULL` |

## identity.user_roles

Quan hệ nhiều nhiều user-role.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `user_id` | `uuid NOT NULL REFERENCES identity.users(id)` |
| `role_id` | `uuid NOT NULL REFERENCES identity.roles(id)` |
| `PRIMARY` | `KEY(user_id,role_id)` |

## identity.role_permissions

Quan hệ nhiều nhiều role-permission.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `role_id` | `uuid NOT NULL REFERENCES identity.roles(id)` |
| `permission_id` | `uuid NOT NULL REFERENCES identity.permissions(id)` |
| `PRIMARY` | `KEY(role_id,permission_id)` |

## identity.sessions

Refresh token chỉ lưu hash, hỗ trợ rotation và thu hồi.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL REFERENCES identity.users(id)` |
| `refresh_token_hash` | `text NOT NULL UNIQUE` |
| `family_id` | `uuid NOT NULL` |
| `user_agent` | `text` |
| `ip` | `inet` |
| `expires_at` | `timestamptz NOT NULL` |
| `revoked_at` | `timestamptz` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## identity.verification_tokens

Xác minh email và reset mật khẩu; token một lần chỉ lưu hash.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL REFERENCES identity.users(id)` |
| `purpose` | `text NOT NULL CHECK(purpose IN ('VERIFY_EMAIL','RESET_PASSWORD'))` |
| `token_hash` | `text NOT NULL UNIQUE` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `expires_at` | `timestamptz NOT NULL` |
| `consumed_at` | `timestamptz` |

## identity.oauth_accounts

Liên kết tài khoản nhà cung cấp đăng nhập.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL REFERENCES identity.users(id)` |
| `provider` | `text NOT NULL` |
| `subject` | `text NOT NULL` |
| `UNIQUE(provider,subject)` | `` |

## identity.travelers

Hành khách lưu sẵn; thông tin giấy tờ mã hóa.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL REFERENCES identity.users(id)` |
| `given_name` | `text NOT NULL` |
| `family_name` | `text NOT NULL` |
| `birth_date` | `date NOT NULL` |
| `gender` | `text` |
| `nationality` | `char(2)` |
| `document_ciphertext` | `text` |
| `document_expires_on` | `date` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## flight.airports

Danh mục sân bay; timezone IANA dùng hiển thị giờ địa phương.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `iata` | `char(3) NOT NULL UNIQUE` |
| `name` | `text NOT NULL` |
| `city` | `text NOT NULL` |
| `country_code` | `char(2) NOT NULL` |
| `timezone` | `text NOT NULL` |

## flight.airlines

Danh mục hãng bay.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `iata` | `varchar(3) NOT NULL UNIQUE` |
| `name` | `text NOT NULL` |
| `logo_url` | `text` |

## flight.suppliers

Nhà cung cấp; chỉ lưu secret reference, không lưu key trong cấu hình JSON.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `code` | `text NOT NULL UNIQUE` |
| `name` | `text NOT NULL` |
| `mode` | `text NOT NULL CHECK(mode IN ('MOCK','SANDBOX','LIVE'))` |
| `enabled` | `boolean NOT NULL DEFAULT false` |
| `secret_ref` | `text` |
| `config` | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| `last_health_at` | `timestamptz` |

## flight.routes

Đường bay tham khảo, không biểu thị tồn chỗ.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `origin_id` | `uuid NOT NULL REFERENCES flight.airports(id)` |
| `destination_id` | `uuid NOT NULL REFERENCES flight.airports(id)` |
| `active` | `boolean NOT NULL DEFAULT true` |
| `UNIQUE(origin_id,destination_id)` | `` |
| `CHECK(origin_id` | `<> destination_id)` |

## flight.searches

Yêu cầu tìm kiếm; có TTL dọn dữ liệu.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` |
| `criteria` | `jsonb NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','READY','PARTIAL','FAILED'))` |
| `expires_at` | `timestamptz NOT NULL` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## flight.offers

Offer từ nhà cung cấp, có thể gồm nhiều chặng và nhiều chiều.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `search_id` | `uuid NOT NULL REFERENCES flight.searches(id)` |
| `supplier_id` | `uuid NOT NULL REFERENCES flight.suppliers(id)` |
| `supplier_offer_id` | `text NOT NULL` |
| `currency` | `char(3) NOT NULL` |
| `total_minor` | `bigint NOT NULL CHECK(total_minor >= 0)` |
| `fare_brand` | `text` |
| `rules` | `jsonb NOT NULL DEFAULT '{}'::jsonb` |
| `payload` | `jsonb NOT NULL` |
| `expires_at` | `timestamptz NOT NULL` |
| `priced_at` | `timestamptz NOT NULL DEFAULT now()` |

## flight.offer_segments

Các chặng offer; journey_no 0 là đi, 1 là về, hỗ trợ multi city bằng số lớn hơn.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `offer_id` | `uuid NOT NULL REFERENCES flight.offers(id)` |
| `journey_no` | `integer NOT NULL CHECK(journey_no >= 0)` |
| `segment_no` | `integer NOT NULL CHECK(segment_no >= 0)` |
| `origin_id` | `uuid NOT NULL REFERENCES flight.airports(id)` |
| `destination_id` | `uuid NOT NULL REFERENCES flight.airports(id)` |
| `airline_id` | `uuid NOT NULL REFERENCES flight.airlines(id)` |
| `operating_airline_code` | `text` |
| `flight_number` | `text NOT NULL` |
| `cabin` | `text NOT NULL` |
| `booking_class` | `text` |
| `departs_at` | `timestamptz NOT NULL` |
| `arrives_at` | `timestamptz NOT NULL` |
| `aircraft_code` | `text` |
| `UNIQUE(offer_id,journey_no,segment_no)` | `` |
| `CHECK(arrives_at` | `> departs_at)` |
| `CHECK(origin_id` | `<> destination_id)` |

## booking.bookings

Aggregate đặt vé; trạng thái xuất vé độc lập trạng thái tiền ở payment service.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `reference` | `text NOT NULL UNIQUE` |
| `user_id` | `uuid NOT NULL` |
| `offer_id` | `uuid NOT NULL` |
| `supplier_id` | `uuid NOT NULL` |
| `supplier_order_id` | `text` |
| `airline_pnr` | `text` |
| `status` | `text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','RESERVING','AWAITING_PAYMENT','ISSUING','TICKETED','EXPIRED','FAILED','CANCEL_PENDING','CANCELLED','MANUAL_REVIEW'))` |
| `currency` | `char(3) NOT NULL` |
| `total_minor` | `bigint NOT NULL CHECK(total_minor >= 0)` |
| `contact_email` | `text NOT NULL` |
| `contact_phone` | `text NOT NULL` |
| `offer_snapshot` | `jsonb NOT NULL` |
| `accepted_rules_version` | `text` |
| `expires_at` | `timestamptz` |
| `version` | `integer NOT NULL DEFAULT 0 CHECK(version >= 0)` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

## booking.passengers

Snapshot hành khách theo booking; không phụ thuộc thay đổi hồ sơ.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `traveler_id` | `uuid` |
| `passenger_type` | `text NOT NULL CHECK(passenger_type IN ('ADT','CHD','INF'))` |
| `given_name` | `text NOT NULL` |
| `family_name` | `text NOT NULL` |
| `birth_date` | `date NOT NULL` |
| `gender` | `text` |
| `nationality` | `char(2)` |
| `document_ciphertext` | `text` |
| `document_expires_on` | `date` |
| `associated_adult_id` | `uuid` |
| `UNIQUE(booking_id,id)` | `` |
| `FOREIGN` | `KEY(booking_id,associated_adult_id) REFERENCES booking.passengers(booking_id,id)` |

## booking.segments

Snapshot chặng của booking; không FK vào offer có TTL.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `journey_no` | `integer NOT NULL CHECK(journey_no >= 0)` |
| `segment_no` | `integer NOT NULL CHECK(segment_no >= 0)` |
| `origin_iata` | `char(3) NOT NULL` |
| `destination_iata` | `char(3) NOT NULL` |
| `marketing_airline` | `text NOT NULL` |
| `operating_airline` | `text` |
| `flight_number` | `text NOT NULL` |
| `cabin` | `text NOT NULL` |
| `departs_at` | `timestamptz NOT NULL` |
| `arrives_at` | `timestamptz NOT NULL` |
| `origin_timezone` | `text NOT NULL` |
| `destination_timezone` | `text NOT NULL` |
| `UNIQUE(booking_id,journey_no,segment_no)` | `` |
| `UNIQUE(booking_id,id)` | `` |
| `CHECK(arrives_at` | `> departs_at)` |

## booking.ancillaries

Ghế, hành lý, suất ăn theo khách/chặng, được nhà cung cấp xác nhận.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `passenger_id` | `uuid NOT NULL` |
| `segment_id` | `uuid NOT NULL` |
| `kind` | `text NOT NULL CHECK(kind IN ('SEAT','BAGGAGE','MEAL'))` |
| `code` | `text NOT NULL` |
| `quantity` | `integer NOT NULL DEFAULT 1 CHECK(quantity > 0)` |
| `amount_minor` | `bigint NOT NULL CHECK(amount_minor >= 0)` |
| `status` | `text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','CONFIRMED','REJECTED','CANCELLED'))` |
| `FOREIGN` | `KEY(booking_id,passenger_id) REFERENCES booking.passengers(booking_id,id)` |
| `FOREIGN` | `KEY(booking_id,segment_id) REFERENCES booking.segments(booking_id,id)` |
| `UNIQUE(passenger_id,segment_id,kind,code)` | `` |

## booking.price_lines

Snapshot tách giá vé, thuế, phí, dịch vụ và giảm giá.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `kind` | `text NOT NULL CHECK(kind IN ('FARE','TAX','SERVICE_FEE','ANCILLARY','DISCOUNT'))` |
| `label` | `text NOT NULL` |
| `amount_minor` | `bigint NOT NULL` |
| `CHECK((kind` | `= 'DISCOUNT' AND amount_minor <= 0) OR (kind <> 'DISCOUNT' AND amount_minor >= 0))` |

## booking.reservations

Lần giữ chỗ của nhà cung cấp; không tự giả định giữ được chỗ.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `supplier_locator` | `text` |
| `request_key` | `text NOT NULL UNIQUE` |
| `status` | `text NOT NULL CHECK(status IN ('REQUESTED','HELD','REJECTED','RELEASED','EXPIRED','UNKNOWN'))` |
| `expires_at` | `timestamptz` |
| `response_snapshot` | `jsonb` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## booking.tickets

Một số vé gắn một hành khách, có thể bao phủ nhiều chặng.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `passenger_id` | `uuid NOT NULL` |
| `ticket_number` | `text NOT NULL UNIQUE` |
| `status` | `text NOT NULL CHECK(status IN ('ISSUED','VOID','REFUNDED','EXCHANGED'))` |
| `issued_at` | `timestamptz NOT NULL` |
| `document_object_key` | `text` |
| `UNIQUE(booking_id,id)` | `` |
| `FOREIGN` | `KEY(booking_id,passenger_id) REFERENCES booking.passengers(booking_id,id)` |

## booking.ticket_coupons

Chặng sử dụng vé: ticket 1:N coupons.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `ticket_id` | `uuid NOT NULL` |
| `segment_id` | `uuid NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','FLOWN','VOID','REFUNDED','EXCHANGED'))` |
| `FOREIGN` | `KEY(booking_id,ticket_id) REFERENCES booking.tickets(booking_id,id)` |
| `FOREIGN` | `KEY(booking_id,segment_id) REFERENCES booking.segments(booking_id,id)` |
| `UNIQUE(ticket_id,segment_id)` | `` |

## booking.change_requests

Yêu cầu đổi/hủy theo khả năng supplier; lưu quote và snapshot có hạn.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `requested_by` | `uuid NOT NULL` |
| `kind` | `text NOT NULL CHECK(kind IN ('CHANGE','CANCEL'))` |
| `status` | `text NOT NULL DEFAULT 'QUOTED' CHECK(status IN ('QUOTED','CONFIRMED','PROCESSING','COMPLETED','REJECTED','EXPIRED','MANUAL_REVIEW'))` |
| `supplier_quote_ref` | `text` |
| `quote_snapshot` | `jsonb NOT NULL` |
| `currency` | `char(3) NOT NULL` |
| `additional_collect_minor` | `bigint NOT NULL DEFAULT 0 CHECK(additional_collect_minor >= 0)` |
| `refund_due_minor` | `bigint NOT NULL DEFAULT 0 CHECK(refund_due_minor >= 0)` |
| `quote_expires_at` | `timestamptz NOT NULL` |
| `confirmed_at` | `timestamptz` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## booking.status_history

Nhật ký chuyển trạng thái có correlation ID.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL REFERENCES booking.bookings(id)` |
| `from_status` | `text` |
| `to_status` | `text NOT NULL` |
| `reason` | `text` |
| `correlation_id` | `uuid NOT NULL` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## payment.payments

Mỗi booking có nhiều lần trả tiền; amount do server tính, không tin frontend.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `booking_id` | `uuid NOT NULL` |
| `change_request_id` | `uuid` |
| `user_id` | `uuid NOT NULL` |
| `provider` | `text NOT NULL` |
| `provider_payment_id` | `text` |
| `purpose` | `text NOT NULL DEFAULT 'BOOKING' CHECK(purpose IN ('BOOKING','CHANGE'))` |
| `status` | `text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCEEDED','FAILED','EXPIRED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED'))` |
| `currency` | `char(3) NOT NULL` |
| `amount_minor` | `bigint NOT NULL CHECK(amount_minor > 0)` |
| `refunded_minor` | `bigint NOT NULL DEFAULT 0 CHECK(refunded_minor >= 0 AND refunded_minor <= amount_minor)` |
| `idempotency_key` | `text NOT NULL UNIQUE` |
| `checkout_url` | `text` |
| `expires_at` | `timestamptz` |
| `paid_at` | `timestamptz` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `UNIQUE(provider,provider_payment_id)` | `` |
| `CHECK((purpose='BOOKING'` | `AND change_request_id IS NULL) OR (purpose='CHANGE' AND change_request_id IS NOT NULL))` |

## payment.webhook_events

Inbox provider webhook; dedup theo provider + event ID.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `provider` | `text NOT NULL` |
| `provider_event_id` | `text NOT NULL` |
| `payload_redacted` | `jsonb NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','PROCESSED','FAILED'))` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz` |
| `UNIQUE(provider,provider_event_id)` | `` |

## payment.refunds

Hoàn tiền độc lập yêu cầu hủy; tổng refund cần kiểm tra trong transaction khóa payment.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `payment_id` | `uuid NOT NULL REFERENCES payment.payments(id)` |
| `change_request_id` | `uuid` |
| `provider_refund_id` | `text` |
| `amount_minor` | `bigint NOT NULL CHECK(amount_minor > 0)` |
| `status` | `text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW'))` |
| `reason` | `text NOT NULL` |
| `idempotency_key` | `text NOT NULL UNIQUE` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `completed_at` | `timestamptz` |

## payment.reconciliation_cases

Đối soát lệch tiền/provider; không tự sửa giao dịch đã thành công.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `payment_id` | `uuid REFERENCES payment.payments(id)` |
| `provider_reference` | `text NOT NULL` |
| `kind` | `text NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED'))` |
| `expected_minor` | `bigint` |
| `actual_minor` | `bigint` |
| `currency` | `char(3) NOT NULL` |
| `assigned_to` | `uuid` |
| `notes` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## engagement.promotions

Coupon, giới hạn số lượt và hiệu lực.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `code` | `text NOT NULL UNIQUE` |
| `title` | `text NOT NULL` |
| `discount_kind` | `text NOT NULL CHECK(discount_kind IN ('FIXED','PERCENT'))` |
| `discount_value` | `bigint NOT NULL CHECK(discount_value > 0)` |
| `currency` | `char(3)` |
| `max_discount_minor` | `bigint CHECK(max_discount_minor >= 0)` |
| `minimum_total_minor` | `bigint NOT NULL DEFAULT 0 CHECK(minimum_total_minor >= 0)` |
| `usage_limit` | `integer CHECK(usage_limit > 0)` |
| `per_user_limit` | `integer NOT NULL DEFAULT 1 CHECK(per_user_limit > 0)` |
| `starts_at` | `timestamptz NOT NULL` |
| `ends_at` | `timestamptz NOT NULL` |
| `enabled` | `boolean NOT NULL DEFAULT true` |
| `CHECK(ends_at` | `> starts_at)` |
| `CHECK((discount_kind='PERCENT'` | `AND discount_value <= 100) OR (discount_kind='FIXED' AND currency IS NOT NULL))` |

## engagement.promotion_redemptions

Reservation lượt coupon tránh vượt quota khi thanh toán song song.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `promotion_id` | `uuid NOT NULL REFERENCES engagement.promotions(id)` |
| `booking_id` | `uuid NOT NULL` |
| `user_id` | `uuid NOT NULL` |
| `amount_minor` | `bigint NOT NULL CHECK(amount_minor >= 0)` |
| `status` | `text NOT NULL CHECK(status IN ('RESERVED','USED','RELEASED'))` |
| `expires_at` | `timestamptz NOT NULL` |
| `UNIQUE(promotion_id,booking_id)` | `` |

## engagement.content_pages

Banner, trang tĩnh, điều khoản; hỗ trợ bản nháp.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `slug` | `text NOT NULL UNIQUE` |
| `kind` | `text NOT NULL CHECK(kind IN ('BANNER','PAGE','TERMS'))` |
| `title` | `text NOT NULL` |
| `body` | `text NOT NULL` |
| `image_object_key` | `text` |
| `status` | `text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED'))` |
| `version` | `integer NOT NULL DEFAULT 1 CHECK(version > 0)` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

## notification.notifications

Thông báo in-app/email; delivery retry không tạo bản ghi nghiệp vụ trùng.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL` |
| `booking_id` | `uuid` |
| `channel` | `text NOT NULL CHECK(channel IN ('IN_APP','EMAIL','SMS'))` |
| `template_code` | `text NOT NULL` |
| `title` | `text NOT NULL` |
| `body` | `text NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','FAILED'))` |
| `dedup_key` | `text NOT NULL UNIQUE` |
| `read_at` | `timestamptz` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## notification.delivery_attempts

Lịch sử gửi thông báo.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `notification_id` | `uuid NOT NULL REFERENCES notification.notifications(id)` |
| `attempt_no` | `integer NOT NULL CHECK(attempt_no > 0)` |
| `provider_reference` | `text` |
| `status` | `text NOT NULL CHECK(status IN ('SENT','FAILED'))` |
| `error_code` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `UNIQUE(notification_id,attempt_no)` | `` |

## assistant.conversations

Phiên chat; server xác thực quyền sở hữu, hỗ trợ chuyển CSKH.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL` |
| `booking_id` | `uuid` |
| `status` | `text NOT NULL DEFAULT 'AI' CHECK(status IN ('AI','HANDOFF','CLOSED'))` |
| `title` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

## assistant.messages

Nội dung chat và citations; lọc/mã hóa PII theo chính sách.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `conversation_id` | `uuid NOT NULL REFERENCES assistant.conversations(id)` |
| `role` | `text NOT NULL CHECK(role IN ('USER','ASSISTANT','TOOL','AGENT'))` |
| `author_user_id` | `uuid` |
| `content` | `text NOT NULL` |
| `citations` | `jsonb NOT NULL DEFAULT '[]'::jsonb` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## assistant.tool_calls

Audit gọi tool; không coi đề xuất của model là quyền thực thi.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `conversation_id` | `uuid NOT NULL REFERENCES assistant.conversations(id)` |
| `message_id` | `uuid REFERENCES assistant.messages(id)` |
| `tool_name` | `text NOT NULL` |
| `arguments_redacted` | `jsonb NOT NULL` |
| `status` | `text NOT NULL CHECK(status IN ('PROPOSED','CONFIRM_REQUIRED','CONFIRMED','EXECUTED','REJECTED','FAILED'))` |
| `confirmation_token_hash` | `text` |
| `confirmation_expires_at` | `timestamptz` |
| `idempotency_key` | `text UNIQUE` |
| `result_redacted` | `jsonb` |
| `latency_ms` | `integer CHECK(latency_ms >= 0)` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## assistant.knowledge_documents

Tri thức có nguồn, phiên bản, ngày hiệu lực và phạm vi truy cập.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `document_key` | `text NOT NULL` |
| `version` | `integer NOT NULL CHECK(version > 0)` |
| `title` | `text NOT NULL` |
| `source_url` | `text` |
| `object_key` | `text` |
| `status` | `text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED'))` |
| `audience` | `text NOT NULL DEFAULT 'PUBLIC' CHECK(audience IN ('PUBLIC','STAFF'))` |
| `airline_code` | `text` |
| `effective_from` | `timestamptz` |
| `effective_to` | `timestamptz` |
| `checksum` | `text NOT NULL` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `UNIQUE(document_key,version)` | `` |
| `CHECK(effective_to` | `IS NULL OR effective_from IS NULL OR effective_to > effective_from)` |

## assistant.knowledge_chunks

Chunk dùng retrieval; vector thêm bằng optional-vector.sql.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `document_id` | `uuid NOT NULL REFERENCES assistant.knowledge_documents(id)` |
| `ordinal` | `integer NOT NULL CHECK(ordinal >= 0)` |
| `content` | `text NOT NULL` |
| `token_count` | `integer CHECK(token_count >= 0)` |
| `UNIQUE(document_id,ordinal)` | `` |

## assistant.feedback

Đánh giá câu trả lời AI để đo chất lượng.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `message_id` | `uuid NOT NULL REFERENCES assistant.messages(id)` |
| `user_id` | `uuid NOT NULL` |
| `rating` | `smallint NOT NULL CHECK(rating IN (-1,1))` |
| `reason` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `UNIQUE(message_id,user_id)` | `` |

## support.cases

Ticket CSKH; liên kết conversation bằng ID logic.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL` |
| `booking_id` | `uuid` |
| `conversation_id` | `uuid` |
| `assigned_to` | `uuid` |
| `subject` | `text NOT NULL` |
| `category` | `text NOT NULL` |
| `status` | `text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','WAITING_CUSTOMER','RESOLVED','CLOSED'))` |
| `priority` | `text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT'))` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

## support.messages

Trao đổi CSKH và ghi chú nội bộ; không lộ note nội bộ cho khách.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `case_id` | `uuid NOT NULL REFERENCES support.cases(id)` |
| `author_id` | `uuid NOT NULL` |
| `body` | `text NOT NULL` |
| `internal` | `boolean NOT NULL DEFAULT false` |
| `attachment_object_key` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## support.audit_logs

Audit hành động quản trị theo resource; append-only bằng quyền database.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `actor_id` | `uuid NOT NULL` |
| `action` | `text NOT NULL` |
| `resource_type` | `text NOT NULL` |
| `resource_id` | `uuid` |
| `before_redacted` | `jsonb` |
| `after_redacted` | `jsonb` |
| `correlation_id` | `uuid NOT NULL` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

## identity.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## identity.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## flight.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## flight.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## booking.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## booking.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## payment.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## payment.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## engagement.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## engagement.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## notification.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## notification.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## assistant.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## assistant.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |

## support.outbox_events

Outbox riêng service; ghi cùng transaction thay đổi aggregate.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `aggregate_id` | `uuid NOT NULL` |
| `aggregate_version` | `integer NOT NULL CHECK(aggregate_version >= 0)` |
| `event_type` | `text NOT NULL` |
| `event_version` | `integer NOT NULL DEFAULT 1` |
| `payload` | `jsonb NOT NULL` |
| `correlation_id` | `uuid NOT NULL` |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` |
| `published_at` | `timestamptz` |
| `attempts` | `integer NOT NULL DEFAULT 0 CHECK(attempts >= 0)` |
| `UNIQUE(aggregate_id,aggregate_version,event_type)` | `` |

## support.inbox_events

Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.

| Cột / ràng buộc | Kiểu và quy tắc SQL |
|---|---|
| `consumer` | `text NOT NULL` |
| `event_id` | `uuid NOT NULL` |
| `received_at` | `timestamptz NOT NULL DEFAULT now()` |
| `processed_at` | `timestamptz NOT NULL DEFAULT now()` |
| `PRIMARY` | `KEY(consumer,event_id)` |
