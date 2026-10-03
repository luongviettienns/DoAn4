-- Bổ sung vào migration.sql sau DDL sinh từ schema.prisma.
-- MySQL >= 8.0.16, InnoDB, strict SQL mode. Chạy một lần qua Prisma Migrate.
-- Không dùng NOW(), subquery hoặc CHECK liên bảng.
-- Các CHECK dưới đây tránh cột FK vì Prisma mặc định ON UPDATE CASCADE;
-- ownership order_id/settled_payment_id/checked_in_by được kiểm tra trong service.

-- Các giá trị này có ngữ nghĩa byte/case-sensitive; key chỉ nhận ASCII ở API.
ALTER TABLE idempotency_keys
  MODIFY COLUMN scope VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  MODIFY COLUMN `key` VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  MODIFY COLUMN request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE outbox_events
  MODIFY COLUMN dedupe_key VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT chk_users_phone CHECK (phone REGEXP '^0[0-9]{9}$'),
  ADD CONSTRAINT chk_users_email_lowercase CHECK (BINARY email = BINARY LOWER(email)),
  ADD CONSTRAINT chk_users_active_password CHECK (status <> 'ACTIVE' OR password_hash IS NOT NULL);

ALTER TABLE movies
  ADD CONSTRAINT chk_movies_duration CHECK (duration_min BETWEEN 1 AND 600),
  ADD CONSTRAINT chk_movies_dates CHECK (end_date IS NULL OR end_date >= release_date),
  ADD CONSTRAINT chk_movies_cast CHECK (`cast` IS NULL OR JSON_TYPE(`cast`) = 'ARRAY');

ALTER TABLE cinemas
  ADD CONSTRAINT chk_cinemas_open_hours CHECK (close_time > open_time);

ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_dimensions CHECK (row_count > 0 AND column_count > 0);

ALTER TABLE seats
  ADD CONSTRAINT chk_seats_number CHECK (seat_number > 0),
  ADD CONSTRAINT chk_seats_span CHECK (
    (type = 'COUPLE' AND column_span = 2)
    OR (type <> 'COUPLE' AND column_span = 1)
  );

ALTER TABLE showtimes
  ADD CONSTRAINT chk_showtimes_interval CHECK (end_time > start_time),
  ADD CONSTRAINT chk_showtimes_cancelled CHECK (
    status <> 'CANCELLED' OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL)
  );

ALTER TABLE showtime_seats
  ADD CONSTRAINT chk_showtime_seats_hold_expiry CHECK (
    (status = 'HELD' AND hold_expires_at IS NOT NULL)
    OR (status <> 'HELD' AND hold_expires_at IS NULL)
  ),
  ADD CONSTRAINT chk_showtime_seats_span CHECK (
    (seat_type = 'COUPLE' AND column_span = 2)
    OR (seat_type <> 'COUPLE' AND column_span = 1)
  );

ALTER TABLE seat_surcharges
  ADD CONSTRAINT chk_surcharges_sellable_type CHECK (seat_type <> 'BLOCKED');

ALTER TABLE orders
  ADD CONSTRAINT chk_orders_money CHECK (
    subtotal = ticket_subtotal + combo_subtotal
    AND discount <= subtotal
    AND total + discount = subtotal
  ),
  ADD CONSTRAINT chk_orders_paid_at CHECK (
    status NOT IN ('PAID', 'PAID_UNFULFILLED') OR paid_at IS NOT NULL
  ),
  ADD CONSTRAINT chk_orders_cancelled_at CHECK (
    status <> 'CANCELLED' OR cancelled_at IS NOT NULL
  ),
  ADD CONSTRAINT chk_orders_age_confirmation CHECK (
    age_rating_snapshot NOT IN ('T13', 'T16', 'T18') OR age_confirmed_at IS NOT NULL
  );

ALTER TABLE order_items
  ADD CONSTRAINT chk_order_items_price CHECK (price = base_price + surcharge),
  ADD CONSTRAINT chk_order_items_sellable CHECK (seat_type <> 'BLOCKED'),
  ADD CONSTRAINT chk_order_items_span CHECK (
    (seat_type = 'COUPLE' AND column_span = 2)
    OR (seat_type <> 'COUPLE' AND column_span = 1)
  );

ALTER TABLE order_combos
  ADD CONSTRAINT chk_order_combos_quantity CHECK (quantity BETWEEN 1 AND 10),
  ADD CONSTRAINT chk_order_combos_total CHECK (line_total = unit_price * quantity);

ALTER TABLE tickets
  ADD CONSTRAINT chk_tickets_used_time CHECK (status <> 'USED' OR checked_in_at IS NOT NULL),
  ADD CONSTRAINT chk_tickets_qr_version CHECK (qr_key_version > 0);

ALTER TABLE vouchers
  ADD CONSTRAINT chk_vouchers_value CHECK (
    (type = 'PERCENT' AND value BETWEEN 1 AND 100)
    OR (type = 'FIXED' AND value > 0)
  ),
  ADD CONSTRAINT chk_vouchers_dates CHECK (valid_to > valid_from),
  ADD CONSTRAINT chk_vouchers_limits CHECK (total_limit > 0 AND per_user_limit > 0),
  ADD CONSTRAINT chk_vouchers_code CHECK (BINARY code = BINARY UPPER(code));

ALTER TABLE voucher_redemptions
  ADD CONSTRAINT chk_redemptions_timestamps CHECK (
    (status = 'RESERVED' AND consumed_at IS NULL AND released_at IS NULL)
    OR (status = 'CONSUMED' AND consumed_at IS NOT NULL AND released_at IS NULL)
    OR (status = 'RELEASED' AND released_at IS NOT NULL)
  );

ALTER TABLE payments
  ADD CONSTRAINT chk_payments_attempt CHECK (attempt_no > 0),
  ADD CONSTRAINT chk_payments_provider_method CHECK (
    (provider = 'VNPAY' AND method = 'VNPAY' AND amount > 0)
    OR (provider = 'MOMO' AND method = 'MOMO' AND amount > 0)
    OR (provider = 'COUNTER' AND method IN ('CASH', 'BANK_TRANSFER', 'CARD') AND amount > 0)
    OR (provider = 'INTERNAL' AND method = 'FREE' AND amount = 0)
  ),
  ADD CONSTRAINT chk_payments_success_time CHECK (status <> 'SUCCESS' OR paid_at IS NOT NULL),
  ADD CONSTRAINT chk_payments_cash CHECK (
    (method = 'CASH' AND cash_received IS NOT NULL AND cash_change IS NOT NULL
      AND cash_received >= amount AND cash_received = amount + cash_change)
    OR (method <> 'CASH' AND cash_received IS NULL AND cash_change IS NULL)
  );

ALTER TABLE refund_requests
  ADD CONSTRAINT chk_refunds_processed CHECK (
    (status = 'PENDING' AND processed_at IS NULL)
    OR (status = 'REFUNDED' AND processed_at IS NOT NULL AND external_reference IS NOT NULL
      AND method IS NOT NULL)
  );

ALTER TABLE reviews
  ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE idempotency_keys
  ADD CONSTRAINT chk_idempotency_response CHECK (
    (status = 'IN_PROGRESS' AND response_status IS NULL AND response_body IS NULL)
    OR (status = 'COMPLETED' AND response_status BETWEEN 100 AND 599 AND response_body IS NOT NULL)
  );

ALTER TABLE outbox_events
  ADD CONSTRAINT chk_outbox_lease CHECK (
    (status = 'PROCESSING' AND locked_until IS NOT NULL AND locked_by IS NOT NULL)
    OR (status <> 'PROCESSING' AND locked_until IS NULL AND locked_by IS NULL)
  ),
  ADD CONSTRAINT chk_outbox_sent CHECK (status <> 'SENT' OR sent_at IS NOT NULL);
