-- Skyvia baseline, PostgreSQL 16+; fresh database only.
BEGIN;
CREATE SCHEMA identity;
CREATE SCHEMA flight;
CREATE SCHEMA booking;
CREATE SCHEMA payment;
CREATE SCHEMA engagement;
CREATE SCHEMA notification;
CREATE SCHEMA assistant;
CREATE SCHEMA support;

-- Tài khoản; email được chuẩn hóa lowercase trước khi ghi.
CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
email text NOT NULL UNIQUE CHECK (email = lower(email)),
password_hash text,
full_name text NOT NULL,
phone text,
status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','BLOCKED','DELETED')),
email_verified_at timestamptz,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
);

-- Vai trò hệ thống.
CREATE TABLE identity.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL
);

-- Quyền theo hành động.
CREATE TABLE identity.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, description text NOT NULL
);

-- Quan hệ nhiều nhiều user-role.
CREATE TABLE identity.user_roles (
  user_id uuid NOT NULL REFERENCES identity.users(id), role_id uuid NOT NULL REFERENCES identity.roles(id), PRIMARY KEY(user_id,role_id)
);

-- Quan hệ nhiều nhiều role-permission.
CREATE TABLE identity.role_permissions (
  role_id uuid NOT NULL REFERENCES identity.roles(id), permission_id uuid NOT NULL REFERENCES identity.permissions(id), PRIMARY KEY(role_id,permission_id)
);

-- Refresh token chỉ lưu hash, hỗ trợ rotation và thu hồi.
CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES identity.users(id), refresh_token_hash text NOT NULL UNIQUE, family_id uuid NOT NULL, user_agent text, ip inet, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- Xác minh email và reset mật khẩu; token một lần chỉ lưu hash.
CREATE TABLE identity.verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES identity.users(id), purpose text NOT NULL CHECK(purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')), token_hash text NOT NULL UNIQUE, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), expires_at timestamptz NOT NULL, consumed_at timestamptz
);

-- Liên kết tài khoản nhà cung cấp đăng nhập.
CREATE TABLE identity.oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES identity.users(id), provider text NOT NULL, subject text NOT NULL, UNIQUE(provider,subject)
);

-- Hành khách lưu sẵn; thông tin giấy tờ mã hóa.
CREATE TABLE identity.travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES identity.users(id), given_name text NOT NULL, family_name text NOT NULL, birth_date date NOT NULL, gender text, nationality char(2), document_ciphertext text, document_expires_on date, created_at timestamptz NOT NULL DEFAULT now()
);

-- Danh mục sân bay; timezone IANA dùng hiển thị giờ địa phương.
CREATE TABLE flight.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), iata char(3) NOT NULL UNIQUE, name text NOT NULL, city text NOT NULL, country_code char(2) NOT NULL, timezone text NOT NULL
);

-- Danh mục hãng bay.
CREATE TABLE flight.airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), iata varchar(3) NOT NULL UNIQUE, name text NOT NULL, logo_url text
);

-- Nhà cung cấp; chỉ lưu secret reference, không lưu key trong cấu hình JSON.
CREATE TABLE flight.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, mode text NOT NULL CHECK(mode IN ('MOCK','SANDBOX','LIVE')), enabled boolean NOT NULL DEFAULT false, secret_ref text, config jsonb NOT NULL DEFAULT '{}'::jsonb, last_health_at timestamptz
);

-- Đường bay tham khảo, không biểu thị tồn chỗ.
CREATE TABLE flight.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), origin_id uuid NOT NULL REFERENCES flight.airports(id), destination_id uuid NOT NULL REFERENCES flight.airports(id), active boolean NOT NULL DEFAULT true, UNIQUE(origin_id,destination_id), CHECK(origin_id <> destination_id)
);

-- Yêu cầu tìm kiếm; có TTL dọn dữ liệu.
CREATE TABLE flight.searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, criteria jsonb NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','READY','PARTIAL','FAILED')), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- Offer từ nhà cung cấp, có thể gồm nhiều chặng và nhiều chiều.
CREATE TABLE flight.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), search_id uuid NOT NULL REFERENCES flight.searches(id), supplier_id uuid NOT NULL REFERENCES flight.suppliers(id), supplier_offer_id text NOT NULL, currency char(3) NOT NULL, total_minor bigint NOT NULL CHECK(total_minor >= 0), fare_brand text, rules jsonb NOT NULL DEFAULT '{}'::jsonb, payload jsonb NOT NULL, expires_at timestamptz NOT NULL, priced_at timestamptz NOT NULL DEFAULT now()
);

-- Các chặng offer; journey_no 0 là đi, 1 là về, hỗ trợ multi city bằng số lớn hơn.
CREATE TABLE flight.offer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), offer_id uuid NOT NULL REFERENCES flight.offers(id), journey_no integer NOT NULL CHECK(journey_no >= 0), segment_no integer NOT NULL CHECK(segment_no >= 0), origin_id uuid NOT NULL REFERENCES flight.airports(id), destination_id uuid NOT NULL REFERENCES flight.airports(id), airline_id uuid NOT NULL REFERENCES flight.airlines(id), operating_airline_code text, flight_number text NOT NULL, cabin text NOT NULL, booking_class text, departs_at timestamptz NOT NULL, arrives_at timestamptz NOT NULL, aircraft_code text, UNIQUE(offer_id,journey_no,segment_no), CHECK(arrives_at > departs_at), CHECK(origin_id <> destination_id)
);

-- Aggregate đặt vé; trạng thái xuất vé độc lập trạng thái tiền ở payment service.
CREATE TABLE booking.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE, user_id uuid NOT NULL, offer_id uuid NOT NULL, supplier_id uuid NOT NULL, supplier_order_id text, airline_pnr text, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','RESERVING','AWAITING_PAYMENT','ISSUING','TICKETED','EXPIRED','FAILED','CANCEL_PENDING','CANCELLED','MANUAL_REVIEW')), currency char(3) NOT NULL, total_minor bigint NOT NULL CHECK(total_minor >= 0), contact_email text NOT NULL, contact_phone text NOT NULL, offer_snapshot jsonb NOT NULL, accepted_rules_version text, expires_at timestamptz, version integer NOT NULL DEFAULT 0 CHECK(version >= 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Snapshot hành khách theo booking; không phụ thuộc thay đổi hồ sơ.
CREATE TABLE booking.passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), traveler_id uuid, passenger_type text NOT NULL CHECK(passenger_type IN ('ADT','CHD','INF')), given_name text NOT NULL, family_name text NOT NULL, birth_date date NOT NULL, gender text, nationality char(2), document_ciphertext text, document_expires_on date, associated_adult_id uuid, UNIQUE(booking_id,id), FOREIGN KEY(booking_id,associated_adult_id) REFERENCES booking.passengers(booking_id,id)
);

-- Snapshot chặng của booking; không FK vào offer có TTL.
CREATE TABLE booking.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), journey_no integer NOT NULL CHECK(journey_no >= 0), segment_no integer NOT NULL CHECK(segment_no >= 0), origin_iata char(3) NOT NULL, destination_iata char(3) NOT NULL, marketing_airline text NOT NULL, operating_airline text, flight_number text NOT NULL, cabin text NOT NULL, departs_at timestamptz NOT NULL, arrives_at timestamptz NOT NULL, origin_timezone text NOT NULL, destination_timezone text NOT NULL, UNIQUE(booking_id,journey_no,segment_no), UNIQUE(booking_id,id), CHECK(arrives_at > departs_at)
);

-- Ghế, hành lý, suất ăn theo khách/chặng, được nhà cung cấp xác nhận.
CREATE TABLE booking.ancillaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), passenger_id uuid NOT NULL, segment_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('SEAT','BAGGAGE','MEAL')), code text NOT NULL, quantity integer NOT NULL DEFAULT 1 CHECK(quantity > 0), amount_minor bigint NOT NULL CHECK(amount_minor >= 0), status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','CONFIRMED','REJECTED','CANCELLED')), FOREIGN KEY(booking_id,passenger_id) REFERENCES booking.passengers(booking_id,id), FOREIGN KEY(booking_id,segment_id) REFERENCES booking.segments(booking_id,id), UNIQUE(passenger_id,segment_id,kind,code)
);

-- Snapshot tách giá vé, thuế, phí, dịch vụ và giảm giá.
CREATE TABLE booking.price_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), kind text NOT NULL CHECK(kind IN ('FARE','TAX','SERVICE_FEE','ANCILLARY','DISCOUNT')), label text NOT NULL, amount_minor bigint NOT NULL, CHECK((kind = 'DISCOUNT' AND amount_minor <= 0) OR (kind <> 'DISCOUNT' AND amount_minor >= 0))
);

-- Lần giữ chỗ của nhà cung cấp; không tự giả định giữ được chỗ.
CREATE TABLE booking.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), supplier_locator text, request_key text NOT NULL UNIQUE, status text NOT NULL CHECK(status IN ('REQUESTED','HELD','REJECTED','RELEASED','EXPIRED','UNKNOWN')), expires_at timestamptz, response_snapshot jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

-- Một số vé gắn một hành khách, có thể bao phủ nhiều chặng.
CREATE TABLE booking.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), passenger_id uuid NOT NULL, ticket_number text NOT NULL UNIQUE, status text NOT NULL CHECK(status IN ('ISSUED','VOID','REFUNDED','EXCHANGED')), issued_at timestamptz NOT NULL, document_object_key text, UNIQUE(booking_id,id), FOREIGN KEY(booking_id,passenger_id) REFERENCES booking.passengers(booking_id,id)
);

-- Chặng sử dụng vé: ticket 1:N coupons.
CREATE TABLE booking.ticket_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), ticket_id uuid NOT NULL, segment_id uuid NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','FLOWN','VOID','REFUNDED','EXCHANGED')), FOREIGN KEY(booking_id,ticket_id) REFERENCES booking.tickets(booking_id,id), FOREIGN KEY(booking_id,segment_id) REFERENCES booking.segments(booking_id,id), UNIQUE(ticket_id,segment_id)
);

-- Yêu cầu đổi/hủy theo khả năng supplier; lưu quote và snapshot có hạn.
CREATE TABLE booking.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), requested_by uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('CHANGE','CANCEL')), status text NOT NULL DEFAULT 'QUOTED' CHECK(status IN ('QUOTED','CONFIRMED','PROCESSING','COMPLETED','REJECTED','EXPIRED','MANUAL_REVIEW')), supplier_quote_ref text, quote_snapshot jsonb NOT NULL, currency char(3) NOT NULL, additional_collect_minor bigint NOT NULL DEFAULT 0 CHECK(additional_collect_minor >= 0), refund_due_minor bigint NOT NULL DEFAULT 0 CHECK(refund_due_minor >= 0), quote_expires_at timestamptz NOT NULL, confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- Nhật ký chuyển trạng thái có correlation ID.
CREATE TABLE booking.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES booking.bookings(id), from_status text, to_status text NOT NULL, reason text, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- Mỗi booking có nhiều lần trả tiền; amount do server tính, không tin frontend.
CREATE TABLE payment.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL, change_request_id uuid, user_id uuid NOT NULL, provider text NOT NULL, provider_payment_id text, purpose text NOT NULL DEFAULT 'BOOKING' CHECK(purpose IN ('BOOKING','CHANGE')), status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCEEDED','FAILED','EXPIRED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED')), currency char(3) NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor > 0), refunded_minor bigint NOT NULL DEFAULT 0 CHECK(refunded_minor >= 0 AND refunded_minor <= amount_minor), idempotency_key text NOT NULL UNIQUE, checkout_url text, expires_at timestamptz, paid_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,provider_payment_id), CHECK((purpose='BOOKING' AND change_request_id IS NULL) OR (purpose='CHANGE' AND change_request_id IS NOT NULL))
);

-- Inbox provider webhook; dedup theo provider + event ID.
CREATE TABLE payment.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, provider_event_id text NOT NULL, payload_redacted jsonb NOT NULL, status text NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','PROCESSED','FAILED')), received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, UNIQUE(provider,provider_event_id)
);

-- Hoàn tiền độc lập yêu cầu hủy; tổng refund cần kiểm tra trong transaction khóa payment.
CREATE TABLE payment.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES payment.payments(id), change_request_id uuid, provider_refund_id text, amount_minor bigint NOT NULL CHECK(amount_minor > 0), status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','PROCESSING','SUCCEEDED','FAILED','MANUAL_REVIEW')), reason text NOT NULL, idempotency_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);

-- Đối soát lệch tiền/provider; không tự sửa giao dịch đã thành công.
CREATE TABLE payment.reconciliation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid REFERENCES payment.payments(id), provider_reference text NOT NULL, kind text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED')), expected_minor bigint, actual_minor bigint, currency char(3) NOT NULL, assigned_to uuid, notes text, created_at timestamptz NOT NULL DEFAULT now()
);

-- Coupon, giới hạn số lượt và hiệu lực.
CREATE TABLE engagement.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, title text NOT NULL, discount_kind text NOT NULL CHECK(discount_kind IN ('FIXED','PERCENT')), discount_value bigint NOT NULL CHECK(discount_value > 0), currency char(3), max_discount_minor bigint CHECK(max_discount_minor >= 0), minimum_total_minor bigint NOT NULL DEFAULT 0 CHECK(minimum_total_minor >= 0), usage_limit integer CHECK(usage_limit > 0), per_user_limit integer NOT NULL DEFAULT 1 CHECK(per_user_limit > 0), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, enabled boolean NOT NULL DEFAULT true, CHECK(ends_at > starts_at), CHECK((discount_kind='PERCENT' AND discount_value <= 100) OR (discount_kind='FIXED' AND currency IS NOT NULL))
);

-- Reservation lượt coupon tránh vượt quota khi thanh toán song song.
CREATE TABLE engagement.promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), promotion_id uuid NOT NULL REFERENCES engagement.promotions(id), booking_id uuid NOT NULL, user_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor >= 0), status text NOT NULL CHECK(status IN ('RESERVED','USED','RELEASED')), expires_at timestamptz NOT NULL, UNIQUE(promotion_id,booking_id)
);

-- Banner, trang tĩnh, điều khoản; hỗ trợ bản nháp.
CREATE TABLE engagement.content_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('BANNER','PAGE','TERMS')), title text NOT NULL, body text NOT NULL, image_object_key text, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')), version integer NOT NULL DEFAULT 1 CHECK(version > 0), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Thông báo in-app/email; delivery retry không tạo bản ghi nghiệp vụ trùng.
CREATE TABLE notification.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, booking_id uuid, channel text NOT NULL CHECK(channel IN ('IN_APP','EMAIL','SMS')), template_code text NOT NULL, title text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','FAILED')), dedup_key text NOT NULL UNIQUE, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- Lịch sử gửi thông báo.
CREATE TABLE notification.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES notification.notifications(id), attempt_no integer NOT NULL CHECK(attempt_no > 0), provider_reference text, status text NOT NULL CHECK(status IN ('SENT','FAILED')), error_code text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notification_id,attempt_no)
);

-- Phiên chat; server xác thực quyền sở hữu, hỗ trợ chuyển CSKH.
CREATE TABLE assistant.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, booking_id uuid, status text NOT NULL DEFAULT 'AI' CHECK(status IN ('AI','HANDOFF','CLOSED')), title text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nội dung chat và citations; lọc/mã hóa PII theo chính sách.
CREATE TABLE assistant.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES assistant.conversations(id), role text NOT NULL CHECK(role IN ('USER','ASSISTANT','TOOL','AGENT')), author_user_id uuid, content text NOT NULL, citations jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit gọi tool; không coi đề xuất của model là quyền thực thi.
CREATE TABLE assistant.tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES assistant.conversations(id), message_id uuid REFERENCES assistant.messages(id), tool_name text NOT NULL, arguments_redacted jsonb NOT NULL, status text NOT NULL CHECK(status IN ('PROPOSED','CONFIRM_REQUIRED','CONFIRMED','EXECUTED','REJECTED','FAILED')), confirmation_token_hash text, confirmation_expires_at timestamptz, idempotency_key text UNIQUE, result_redacted jsonb, latency_ms integer CHECK(latency_ms >= 0), created_at timestamptz NOT NULL DEFAULT now()
);

-- Tri thức có nguồn, phiên bản, ngày hiệu lực và phạm vi truy cập.
CREATE TABLE assistant.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_key text NOT NULL, version integer NOT NULL CHECK(version > 0), title text NOT NULL, source_url text, object_key text, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')), audience text NOT NULL DEFAULT 'PUBLIC' CHECK(audience IN ('PUBLIC','STAFF')), airline_code text, effective_from timestamptz, effective_to timestamptz, checksum text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_key,version), CHECK(effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

-- Chunk dùng retrieval; vector thêm bằng optional-vector.sql.
CREATE TABLE assistant.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES assistant.knowledge_documents(id), ordinal integer NOT NULL CHECK(ordinal >= 0), content text NOT NULL, token_count integer CHECK(token_count >= 0), UNIQUE(document_id,ordinal)
);

-- Đánh giá câu trả lời AI để đo chất lượng.
CREATE TABLE assistant.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES assistant.messages(id), user_id uuid NOT NULL, rating smallint NOT NULL CHECK(rating IN (-1,1)), reason text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(message_id,user_id)
);

-- Ticket CSKH; liên kết conversation bằng ID logic.
CREATE TABLE support.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, booking_id uuid, conversation_id uuid, assigned_to uuid, subject text NOT NULL, category text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','WAITING_CUSTOMER','RESOLVED','CLOSED')), priority text NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trao đổi CSKH và ghi chú nội bộ; không lộ note nội bộ cho khách.
CREATE TABLE support.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES support.cases(id), author_id uuid NOT NULL, body text NOT NULL, internal boolean NOT NULL DEFAULT false, attachment_object_key text, created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit hành động quản trị theo resource; append-only bằng quyền database.
CREATE TABLE support.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL, action text NOT NULL, resource_type text NOT NULL, resource_id uuid, before_redacted jsonb, after_redacted jsonb, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE identity.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE identity.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE flight.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE flight.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE booking.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE booking.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE payment.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE payment.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE engagement.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE engagement.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE notification.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE notification.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE assistant.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE assistant.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);

-- Outbox riêng service; ghi cùng transaction thay đổi aggregate.
CREATE TABLE support.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), aggregate_id uuid NOT NULL, aggregate_version integer NOT NULL CHECK(aggregate_version >= 0), event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1, payload jsonb NOT NULL, correlation_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0), UNIQUE(aggregate_id,aggregate_version,event_type)
);

-- Dedup consumer; ghi inbox và cập nhật nghiệp vụ cùng transaction.
CREATE TABLE support.inbox_events (
  consumer text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(consumer,event_id)
);
CREATE INDEX sessions_active_idx ON identity.sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE INDEX offers_search_idx ON flight.offers(search_id,total_minor);
CREATE INDEX offers_expiry_idx ON flight.offers(expires_at);
CREATE INDEX bookings_cursor_idx ON booking.bookings(user_id,created_at DESC,id DESC);
CREATE INDEX bookings_expiry_idx ON booking.bookings(expires_at) WHERE status = 'AWAITING_PAYMENT';
CREATE UNIQUE INDEX one_live_seat_per_booking ON booking.ancillaries(booking_id,segment_id,code) WHERE kind = 'SEAT' AND status IN ('REQUESTED','CONFIRMED');
CREATE INDEX payments_booking_idx ON payment.payments(booking_id,created_at DESC);
CREATE INDEX notifications_cursor_idx ON notification.notifications(user_id,created_at DESC,id DESC);
CREATE INDEX messages_cursor_idx ON assistant.messages(conversation_id,created_at,id);
CREATE INDEX cases_queue_idx ON support.cases(status,priority,created_at);
CREATE INDEX redemption_quota_idx ON engagement.promotion_redemptions(promotion_id,user_id,status);
CREATE INDEX identity_user_roles_role_id_idx ON identity.user_roles(role_id);
CREATE INDEX identity_role_permissions_permission_id_idx ON identity.role_permissions(permission_id);
CREATE INDEX identity_sessions_user_id_idx ON identity.sessions(user_id);
CREATE INDEX identity_verification_tokens_user_id_idx ON identity.verification_tokens(user_id);
CREATE INDEX identity_oauth_accounts_user_id_idx ON identity.oauth_accounts(user_id);
CREATE INDEX identity_travelers_user_id_idx ON identity.travelers(user_id);
CREATE INDEX flight_routes_destination_id_idx ON flight.routes(destination_id);
CREATE INDEX flight_offers_search_id_idx ON flight.offers(search_id);
CREATE INDEX flight_offers_supplier_id_idx ON flight.offers(supplier_id);
CREATE INDEX flight_offer_segments_origin_id_idx ON flight.offer_segments(origin_id);
CREATE INDEX flight_offer_segments_destination_id_idx ON flight.offer_segments(destination_id);
CREATE INDEX flight_offer_segments_airline_id_idx ON flight.offer_segments(airline_id);
CREATE INDEX booking_ancillaries_booking_id_idx ON booking.ancillaries(booking_id);
CREATE INDEX booking_price_lines_booking_id_idx ON booking.price_lines(booking_id);
CREATE INDEX booking_reservations_booking_id_idx ON booking.reservations(booking_id);
CREATE INDEX booking_ticket_coupons_booking_id_idx ON booking.ticket_coupons(booking_id);
CREATE INDEX booking_change_requests_booking_id_idx ON booking.change_requests(booking_id);
CREATE INDEX booking_status_history_booking_id_idx ON booking.status_history(booking_id);
CREATE INDEX payment_refunds_payment_id_idx ON payment.refunds(payment_id);
CREATE INDEX payment_reconciliation_cases_payment_id_idx ON payment.reconciliation_cases(payment_id);
CREATE INDEX assistant_messages_conversation_id_idx ON assistant.messages(conversation_id);
CREATE INDEX assistant_tool_calls_conversation_id_idx ON assistant.tool_calls(conversation_id);
CREATE INDEX assistant_tool_calls_message_id_idx ON assistant.tool_calls(message_id);
CREATE INDEX support_messages_case_id_idx ON support.messages(case_id);
CREATE INDEX outbox_pending_idx ON identity.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON flight.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON booking.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON payment.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON engagement.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON notification.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON assistant.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE INDEX outbox_pending_idx ON support.outbox_events(occurred_at) WHERE published_at IS NULL;
CREATE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON identity.users FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON booking.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON engagement.content_pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON assistant.conversations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON support.cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
COMMIT;
