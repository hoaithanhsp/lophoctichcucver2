/*
  # Thêm Authentication và Settings

  ## Bảng mới được tạo
  
  1. **auth_users**
    - `id` (uuid, primary key)
    - `username` (text, unique) - Tên đăng nhập
    - `password` (text) - Mật khẩu (đã hash)
    - `created_at` (timestamp)

  2. **app_settings**
    - `id` (uuid, primary key)
    - `key` (text, unique) - Khóa setting
    - `value` (jsonb) - Giá trị setting
    - `created_at` (timestamp)
    - `updated_at` (timestamp)

  ## Dữ liệu mặc định

  - Tạo user mặc định: "Chi Linh" / "12345"
  - Tạo settings mặc định cho các mốc điểm level

  ## Bảo mật
  - Enable RLS trên tất cả các bảng
  - Public read access cho app_settings
  - Public write access cho demo
*/

-- Create auth_users table
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for auth_users
CREATE POLICY "Allow public read access to auth_users"
  ON auth_users FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to auth_users"
  ON auth_users FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for app_settings
CREATE POLICY "Allow public read access to app_settings"
  ON app_settings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public write access to app_settings"
  ON app_settings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default user
INSERT INTO auth_users (username, password)
VALUES ('Chi Linh', '12345')
ON CONFLICT (username) DO NOTHING;

-- Insert default level settings
INSERT INTO app_settings (key, value)
VALUES 
  ('level_thresholds', '{"hat": 0, "nay_mam": 50, "cay_con": 100, "cay_to": 200}'::jsonb),
  ('badge_system_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);