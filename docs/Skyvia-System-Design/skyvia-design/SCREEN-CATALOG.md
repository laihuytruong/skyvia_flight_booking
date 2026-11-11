# Bộ màn hình Skyvia

32 màn hình chính trong phạm vi đã định. Ảnh được chia 4 board, mỗi board 8 màn hình desktop. Route, tên trường và hành vi trong tài liệu này là đặc tả để code; hình chỉ minh họa bố cục, chữ nhỏ trong ảnh có thể khác.

## Design system

- Canvas desktop 1440px, max-width nội dung 1200px; grid 12 cột; form/summary 8:4. Admin sidebar 240px.
- Font Inter hoặc Be Vietnam Pro. Body 16px, secondary 14px, H1 32–40px; line-height 1.5. Spacing 4/8/12/16/24/32/48; card radius 12px.
- Primary #2563EB; ink #0F172A; page #F8FAFC; border #E2E8F0; success #15803D; warning #B45309; danger #B91C1C. Kiểm tra contrast trên component thực tế, không chỉ theo token.
- Button cao 44px; label luôn hiện ngoài input; error text dưới field; focus ring rõ; dialog giữ focus; toast không thay thế thông báo lỗi trong form.
- Giá luôn có currency và phân biệt tổng đơn với mỗi khách; giờ bay kèm sân bay/timezone khi khác vùng; hiển thị ngày tuyệt đối trong xác nhận AI.
- Trạng thái chung cho mỗi trang dữ liệu: loading skeleton, empty state với CTA phù hợp, lỗi + retry, offline, session expired; admin có forbidden, chat có provider timeout.
- Responsive: dưới 768px dùng một cột, filter drawer, sticky CTA và summary thu gọn. UI chỉ cho bước tiếp theo khi dữ liệu đã được server xác nhận; back/refresh phục hồi draft thuộc user.

## Nhóm 1 — Khám phá và tài khoản

| ID / màn hình | Route React | Thành phần và dữ liệu | CTA / trạng thái đặc thù |
|---|---|---|---|
| 01 Trang chủ | `/` | Header, search form một chiều/khứ hồi; sân bay đi/đến; ngày; ADT/CHD/INF; cabin; ưu đãi; AI launcher | Tìm chuyến; swap sân bay; lỗi ngày về trước ngày đi; không chọn cùng sân bay |
| 02 Kết quả tìm kiếm | `/flights?searchId=` | Search summary, date strip, filter hãng/giờ/điểm dừng/hành lý/giá; cards offer cả hành trình; sort; nguồn giá và expiry | Chọn offer; no result; partial supplier failure; reprice khi hết TTL; không hardcode giá |
| 03 Chi tiết chuyến | `/flights/offers/:offerId` | Chặng đi/về, layover, cabin/fare brand, fare rules, baggage, thuế/phí, capability chọn ghế | Tiếp tục; so sánh hạng; giá đổi cần chấp nhận lại; supplier không hỗ trợ tính năng thì ẩn/giải thích |
| 04 Đăng nhập | `/login` | Email, password, show/hide, Google nếu đã cấu hình, quên mật khẩu, link đăng ký | Đăng nhập; lỗi thông tin chung; tài khoản blocked/unverified; giữ returnTo an toàn |
| 05 Đăng ký | `/register` | Họ tên, email, password, xác nhận password, điều khoản có version | Tạo tài khoản; strength và lỗi field; chuyển verify; không tự đăng ký nhận marketing |
| 06 Xác minh email | `/verify-email` | OTP 6 số, email masked, thời gian còn lại, resend cooldown | Xác minh/gửi lại; sai mã, quá số lần, expired, verified; paste OTP accessible |
| 07 Quên mật khẩu | `/forgot-password` | Email form, trạng thái đã gửi hướng dẫn | Gửi liên kết; cùng thông báo với email có/không tồn tại; rate limit |
| 08 Đặt mật khẩu mới | `/reset-password?token=` | Password và confirm, link token, success panel | Lưu; token invalid/expired/used; thu hồi session theo chính sách; quay login |

## Nhóm 2 — Đặt vé và thanh toán

| ID / màn hình | Route React | Thành phần và dữ liệu | CTA / trạng thái đặc thù |
|---|---|---|---|
| 09 Hành khách | `/booking/:id/passengers` | Stepper, form từng ADT/CHD/INF, saved travelers, họ tên đúng giấy tờ, birth date/nationality/document theo supplier, email/phone liên hệ, summary | Lưu và tiếp tục; kiểm tra tuổi vào ngày bay và liên kết infant với adult; không copy PII vào URL/log |
| 10 Chọn ghế | `/booking/:id/seats` | Map theo segment và cabin, legend/giá, passenger tabs, ghế đã chọn, điều kiện supplier | Xác nhận lựa chọn hoặc bỏ qua nếu cho phép; unavailable, map không hỗ trợ, seat rejected; không khẳng định đã giữ ghế trước supplier confirm |
| 11 Hành lý & dịch vụ | `/booking/:id/extras` | Hành lý theo khách/chặng, meal, included allowance, tổng phí từng mục | Thêm/bỏ dịch vụ, tiếp tục; optional không tick sẵn; capability phụ thuộc supplier |
| 12 Kiểm tra đặt vé | `/booking/:id/review` | Chặng/khách/seat/extras, giá breakdown, coupon, điều kiện đổi/hủy có version, countdown thực, checkbox đồng ý | Xác nhận và thanh toán; reprice diff phải xác nhận mới; hold chỉ hiển thị nếu supplier đã xác nhận |
| 13 Thanh toán | `/booking/:id/payment` | Order reference, tổng/currency, provider method đã bật, QR/redirect hosted checkout, deadline, trạng thái xác minh | Thanh toán/đổi phương thức; không thu PAN/CVV trong form tự làm; không tạo payment mới khi chỉ refresh trang |
| 14 Đang xử lý | `/booking/:id/processing` | Payment verification → payment received → issuing → issued, trạng thái SSE/poll fallback, link hỗ trợ | Chờ/tra cứu lại; payment chưa xác minh, supplier pending, manual review; không báo ticket success khi chỉ có redirect |
| 15 Đặt vé thành công | `/booking/:id/success` | Booking ref, airline PNR, ticket từng khách, journey summary, hóa đơn/biên nhận theo hỗ trợ, download e-ticket | Xem vé/tải PDF; chỉ hiện thành công khi đã có ticket đủ; download qua ownership check |
| 16 Thanh toán lỗi/hết hạn | `/booking/:id/payment-status` | Biến thể FAILED, EXPIRED, thanh toán muộn đang đối soát; hướng dẫn và số hỗ trợ | Thử lại nếu booking còn hợp lệ hoặc tìm chuyến mới; không retry thu tiền khi provider status UNKNOWN |

## Nhóm 3 — Chuyến đi và AI

| ID / màn hình | Route React | Thành phần và dữ liệu | CTA / trạng thái đặc thù |
|---|---|---|---|
| 17 Vé của tôi | `/trips` | Tabs sắp tới/đã qua/đã hủy; card hành trình, passengers count, ticket/payment status; cursor pagination | Xem chi tiết; empty CTA tìm vé; render riêng pending và ticketed |
| 18 Chi tiết đặt vé | `/trips/:id` | Snapshot chặng/khách, ticket/coupon, payment/refund, timeline, fare rules; signed download | Đổi/hủy nếu hợp lệ, hỏi AI, tạo case; 403 nếu không sở hữu; ghi rõ vé đang xử lý |
| 19 Đổi chuyến | `/trips/:id/change` | Chọn phạm vi/khách theo supplier; itinerary cũ và quote mới; fare difference, phí, quote expiry; confirm dialog | Quote → xác nhận → trả thêm nếu cần → processing; không hỗ trợ tự động thì gửi case |
| 20 Hủy & hoàn tiền | `/trips/:id/cancel` | Điều kiện, phạm vi khách/chặng, cancellation fee, refund amount/currency, phương thức gốc, quote expiry, lý do | Xác nhận hủy một lần; ineligible; manual request; canceled nhưng refund pending hiển thị tách biệt |
| 21 Hồ sơ & bảo mật | `/account?tab=` | Tabs profile/travelers/security/sessions; personal form; masked documents; đổi mật khẩu; active sessions với revoke | Lưu/revoke; xác nhận hành động nhạy cảm; session hiện tại rõ; không gửi lại ciphertext về frontend |
| 22 Thông báo & ưu đãi | `/notifications?tab=` | Tabs thông báo/ưu đãi; read state, booking links; coupon code, điều kiện, expiry | Đánh dấu đã đọc/sử dụng ưu đãi; empty; expired coupon không áp dụng |
| 23 Chatbot AI | `/assistant/:conversationId?` | History, streaming chat, suggested prompts, offer cards, source citations, trip context, confirmation card, stop/regenerate, feedback, handoff | Gửi tin/chọn offer/xác nhận/chuyển nhân viên; không tự submit payment; hết budget, timeout và stale quote có thông báo |
| 24 Trung tâm hỗ trợ | `/help?tab=` | FAQ search, category, support form liên kết booking, case history và thread, attachments theo allowlist | Tạo case/gửi reply; ticket open/resolved; chat handoff; internal notes không xuất hiện |

## Nhóm 4 — Quản trị và CSKH

| ID / màn hình | Route React | Thành phần và dữ liệu | CTA / trạng thái đặc thù |
|---|---|---|---|
| 25 Dashboard | `/admin` | KPIs, date/currency filters, booking funnel, revenue vs refunds phân biệt, issuance pending, supplier health | Drilldown theo số liệu; empty/no permission; không cộng thẳng doanh thu khác currency |
| 26 Quản lý đặt vé | `/admin/bookings/:id?` | Search ref/PNR, status/date/supplier filters, paginated table, detail drawer/timeline, failed issuance queue | Investigate/manual retry sau supplier lookup, tạo case; mutation cần reason và audit |
| 27 Danh mục & supplier | `/admin/catalog?tab=` | Airports, airlines, routes, supplier capabilities/mode/health; form cập nhật; đồng bộ danh mục | Lưu/sync; phân biệt mock/sandbox/live; secret chỉ là masked reference, không lộ giá trị |
| 28 Giao dịch & hoàn tiền | `/admin/payments?tab=` | Payment/refund/reconciliation tabs, provider ref, amount/currency, detail, reason và lịch sử | Duyệt refund nếu có quyền; không đánh dấu success thủ công thay provider; pending/failed có task |
| 29 Khách hàng & phân quyền | `/admin/users?tab=` | User table/profile, account status, role bindings, permission matrix, revoke sessions | Block/unblock/revoke/assign role; chống tự nâng quyền và audit trước/sau |
| 30 Ưu đãi & nội dung | `/admin/content?tab=` | Coupon form, quota/date/minimum/cap, content/banner draft/published/preview, terms version | Lưu nháp/publish/archive; invalid date hoặc vượt quota; sanitize nội dung hiển thị |
| 31 Hộp thư CSKH | `/admin/support/:caseId?` | Queue filter priority/assignment; thread giữa; booking context phải; internal note toggle; AI handoff context | Nhận case/trả lời/escalate/resolve; assigned agent concurrency; note nội bộ khác reply khách |
| 32 Tri thức AI & cấu hình | `/admin/ai?tab=` | Documents/version/status/audience/effective dates, retrieval test+citations, evaluations/tool error metrics; integrations settings tab | Upload/index/test/publish/archive; failed indexing; model config secret refs; không publish tài liệu chưa duyệt |

## Điều hướng và quyền

Public: 01–08, FAQ của 24. CUSTOMER: 09–24, chỉ dữ liệu của mình. SUPPORT: 25/26/31 và phần đọc của 28/29 theo permission. ADMIN: 25–32 theo quyền chi tiết; không dùng một Boolean `isAdmin` cho mọi hành động.

Các bước hành khách → ghế → extras → review → payment cần guards theo trạng thái booking server. Deep link vào success không làm thay đổi state. Sau logout xóa cache dữ liệu cá nhân trên React Query và reset draft local.

## Các biến thể không tính thành màn hình mới

Calendar/date picker, passenger count popover, airport autocomplete, filter drawer, confirm/reprice/refund dialogs, 404/403, global session-expired modal, skeleton/empty/error, mobile navigation, file upload progress và toast. Các biến thể này phải được triển khai cùng component; bộ 32 màn hình không tuyên bố bao phủ mọi khả năng mở rộng trong tương lai.
