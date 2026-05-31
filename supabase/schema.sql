-- ============================================
-- IMAN Booking Slot - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing if re-running
DROP FUNCTION IF EXISTS create_booking CASCADE;
DROP FUNCTION IF EXISTS get_slot_availability CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

-- Bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_ref TEXT UNIQUE NOT NULL,
  slot_time TEXT NOT NULL,
  event_date DATE NOT NULL,
  nama TEXT NOT NULL,
  email TEXT NOT NULL,
  no_telefon TEXT NOT NULL,
  umur INTEGER NOT NULL,
  daerah TEXT NOT NULL,
  negeri TEXT NOT NULL,
  bilangan INTEGER NOT NULL DEFAULT 1 CHECK (bilangan >= 1 AND bilangan <= 3),
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(email, event_date)
);

-- Indexes for performance
CREATE INDEX idx_bookings_slot ON bookings(event_date, slot_time);
CREATE INDEX idx_bookings_ref ON bookings(booking_ref);
CREATE INDEX idx_bookings_email ON bookings(email);

-- ============================================
-- RPC: Atomic booking (race-condition safe)
-- Uses SECURITY DEFINER to bypass RLS for inserts
-- ============================================
CREATE OR REPLACE FUNCTION create_booking(
  p_slot_time TEXT,
  p_event_date DATE,
  p_nama TEXT,
  p_email TEXT,
  p_no_telefon TEXT,
  p_umur INTEGER,
  p_daerah TEXT,
  p_negeri TEXT,
  p_bilangan INTEGER DEFAULT 1,
  p_max_per_slot INTEGER DEFAULT 30
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_ref TEXT;
  v_booking_id UUID;
BEGIN
  -- Validate bilangan
  IF p_bilangan < 1 OR p_bilangan > 3 THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_BILANGAN');
  END IF;

  -- Lock rows for this slot to prevent race conditions
  PERFORM 1 FROM bookings
  WHERE slot_time = p_slot_time AND event_date = p_event_date
  FOR UPDATE;

  -- Count total PEOPLE (not rows)
  SELECT COALESCE(SUM(bilangan), 0) INTO v_count
  FROM bookings
  WHERE slot_time = p_slot_time AND event_date = p_event_date;

  -- Check capacity (people + new bilangan)
  IF v_count + p_bilangan > p_max_per_slot THEN
    RETURN json_build_object('success', false, 'error', 'SLOT_FULL');
  END IF;

  -- Check if already booked for this date
  IF EXISTS (SELECT 1 FROM bookings WHERE email = p_email AND event_date = p_event_date) THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_BOOKED');
  END IF;

  -- Generate unique booking reference (retry if collision)
  LOOP
    v_ref := 'IMAN-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_ref = v_ref);
  END LOOP;

  -- Insert booking with bilangan
  INSERT INTO bookings (booking_ref, slot_time, event_date, nama, email, no_telefon, umur, daerah, negeri, bilangan)
  VALUES (v_ref, p_slot_time, p_event_date, p_nama, p_email, p_no_telefon, p_umur, p_daerah, p_negeri, p_bilangan)
  RETURNING id INTO v_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_ref', v_ref,
    'id', v_booking_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: Get slot availability for a date
-- ============================================
CREATE OR REPLACE FUNCTION get_slot_availability(p_event_date DATE)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT json_agg(row_to_json(t))
     FROM (
       SELECT slot_time, COALESCE(SUM(bilangan), 0)::int as booked_count
       FROM bookings
       WHERE event_date = p_event_date
       GROUP BY slot_time
       ORDER BY slot_time
     ) t),
    '[]'::json
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public can read all bookings (needed for confirmation lookup & slot counts)
CREATE POLICY "Public read access"
  ON bookings FOR SELECT
  USING (true);

-- Authenticated users (admins) can do everything
CREATE POLICY "Admin full access"
  ON bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
