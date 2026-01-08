/*
  # Lớp Học Tích Cực - Database Schema

  ## Tables Created
  
  1. **classes**
    - `id` (uuid, primary key)
    - `name` (text) - Tên lớp học
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  2. **students**
    - `id` (uuid, primary key)
    - `class_id` (uuid, foreign key)
    - `name` (text) - Tên học sinh
    - `order_number` (integer) - Số thứ tự
    - `avatar` (text, nullable) - URL avatar
    - `total_points` (integer) - Tổng điểm hiện tại
    - `level` (text) - Level hiện tại: hat, nay_mam, cay_con, cay_to
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  3. **point_history**
    - `id` (uuid, primary key)
    - `student_id` (uuid, foreign key)
    - `change` (integer) - Số điểm thay đổi (+/-)
    - `reason` (text) - Lý do
    - `points_after` (integer) - Điểm sau khi thay đổi
    - `created_at` (timestamp)

  4. **rewards**
    - `id` (uuid, primary key)
    - `class_id` (uuid, foreign key)
    - `name` (text) - Tên quà
    - `description` (text) - Mô tả
    - `points_required` (integer) - Số điểm cần
    - `icon` (text) - Icon emoji
    - `order_number` (integer) - Thứ tự hiển thị
    - `is_active` (boolean) - Còn hoạt động không
    - `created_at` (timestamp)

  5. **reward_redemptions**
    - `id` (uuid, primary key)
    - `student_id` (uuid, foreign key)
    - `reward_id` (uuid, foreign key)
    - `points_spent` (integer) - Số điểm đã tiêu
    - `created_at` (timestamp)

  ## Security
  - Enable RLS on all tables
  - Public read access for demo purposes
  - Public write access for demo purposes (in production should be authenticated)
*/

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Lớp học của tôi',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_number integer NOT NULL DEFAULT 0,
  avatar text,
  total_points integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'hat',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create point_history table
CREATE TABLE IF NOT EXISTS point_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  change integer NOT NULL,
  reason text,
  points_after integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  points_required integer NOT NULL,
  icon text NOT NULL DEFAULT '🎁',
  order_number integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create reward_redemptions table
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  points_spent integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
CREATE POLICY "Allow public read access to classes"
  ON classes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to classes"
  ON classes FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to students"
  ON students FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to students"
  ON students FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to point_history"
  ON point_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to point_history"
  ON point_history FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to rewards"
  ON rewards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to rewards"
  ON rewards FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to reward_redemptions"
  ON reward_redemptions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to reward_redemptions"
  ON reward_redemptions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_total_points ON students(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_point_history_student_id ON point_history(student_id);
CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON point_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_class_id ON rewards(class_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_student_id ON reward_redemptions(student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();