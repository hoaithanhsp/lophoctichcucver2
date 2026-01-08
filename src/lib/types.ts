export type Level = 'hat' | 'nay_mam' | 'cay_con' | 'cay_to';

export interface Student {
  id: string;
  class_id: string;
  name: string;
  order_number: number;
  avatar: string | null;
  total_points: number;
  level: Level;
  created_at: string;
  updated_at: string;
}

export interface PointHistory {
  id: string;
  student_id: string;
  change: number;
  reason: string | null;
  points_after: number;
  created_at: string;
}

export interface Reward {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  points_required: number;
  icon: string;
  order_number: number;
  is_active: boolean;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  student_id: string;
  reward_id: string;
  points_spent: number;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  password: string;
  created_at: string;
}

export interface AppSettings {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export interface LevelThresholds {
  hat: number;
  nay_mam: number;
  cay_con: number;
  cay_to: number;
}

export interface Database {
  public: {
    Tables: {
      classes: {
        Row: Class;
        Insert: Omit<Class, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Class, 'id' | 'created_at' | 'updated_at'>>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
      };
      point_history: {
        Row: PointHistory;
        Insert: Omit<PointHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<PointHistory, 'id' | 'created_at'>>;
      };
      rewards: {
        Row: Reward;
        Insert: Omit<Reward, 'id' | 'created_at'>;
        Update: Partial<Omit<Reward, 'id' | 'created_at'>>;
      };
      reward_redemptions: {
        Row: RewardRedemption;
        Insert: Omit<RewardRedemption, 'id' | 'created_at'>;
        Update: Partial<Omit<RewardRedemption, 'id' | 'created_at'>>;
      };
      auth_users: {
        Row: AuthUser;
        Insert: Omit<AuthUser, 'id' | 'created_at'>;
        Update: Partial<Omit<AuthUser, 'id' | 'created_at'>>;
      };
      app_settings: {
        Row: AppSettings;
        Insert: Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AppSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

export const LEVEL_CONFIG = {
  hat: {
    name: 'Hạt',
    icon: '🌰',
    color: '#8B4513'
  },
  nay_mam: {
    name: 'Nảy mầm',
    icon: '🌱',
    color: '#90EE90'
  },
  cay_con: {
    name: 'Cây con',
    icon: '🌿',
    color: '#4CAF50'
  },
  cay_to: {
    name: 'Cây to',
    icon: '🌳',
    color: '#2E7D32'
  }
} as const;

export function getLevelFromPoints(points: number, thresholds?: LevelThresholds): Level {
  const t = thresholds || { hat: 0, nay_mam: 50, cay_con: 100, cay_to: 200 };
  if (points >= t.cay_to) return 'cay_to';
  if (points >= t.cay_con) return 'cay_con';
  if (points >= t.nay_mam) return 'nay_mam';
  return 'hat';
}

export function getNextLevel(currentLevel: Level): Level | null {
  const levels: Level[] = ['hat', 'nay_mam', 'cay_con', 'cay_to'];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

export function getProgressToNextLevel(points: number, level: Level, thresholds?: LevelThresholds): { current: number; total: number; percentage: number; pointsNeeded: number } {
  const t = thresholds || { hat: 0, nay_mam: 50, cay_con: 100, cay_to: 200 };
  const nextLevel = getNextLevel(level);

  if (!nextLevel) {
    return { current: 0, total: 100, percentage: 100, pointsNeeded: 0 };
  }

  const currentThreshold = t[level];
  const nextThreshold = t[nextLevel];
  const current = points - currentThreshold;
  const total = nextThreshold - currentThreshold;
  const percentage = Math.min(100, (current / total) * 100);
  const pointsNeeded = nextThreshold - points;

  return { current, total, percentage, pointsNeeded };
}
