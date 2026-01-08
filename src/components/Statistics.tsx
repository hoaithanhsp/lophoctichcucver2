import { useState, useEffect } from 'react';
import { X, TrendingUp, Award, Users } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { supabase } from '../lib/supabase';
import { Student, PointHistory, LEVEL_CONFIG } from '../lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend);

interface StatisticsProps {
  onClose: () => void;
  classId: string;
}

interface LevelDistribution {
  hat: number;
  nay_mam: number;
  cay_con: number;
  cay_to: number;
}

interface ReasonStats {
  reason: string;
  count: number;
  totalPoints: number;
}

export default function Statistics({ onClose, classId }: StatisticsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);

    const [studentsResult, historyResult] = await Promise.all([
      supabase.from('students').select('*').eq('class_id', classId),
      supabase.from('point_history').select('*').order('created_at', { ascending: true })
    ]);

    if (studentsResult.data) {
      setStudents(studentsResult.data);
    }

    if (historyResult.data) {
      const studentIds = studentsResult.data?.map(s => s.id) || [];
      const filteredHistory = historyResult.data.filter(h => studentIds.includes(h.student_id));
      setPointHistory(filteredHistory);
    }

    setLoading(false);
  };

  const getLevelDistribution = (): LevelDistribution => {
    return students.reduce((acc, student) => {
      acc[student.level]++;
      return acc;
    }, { hat: 0, nay_mam: 0, cay_con: 0, cay_to: 0 } as LevelDistribution);
  };

  const getTopReasons = (isPositive: boolean): ReasonStats[] => {
    const filtered = pointHistory.filter(h => isPositive ? h.change > 0 : h.change < 0);
    const grouped = filtered.reduce((acc, h) => {
      const reason = h.reason || (isPositive ? 'Cộng điểm' : 'Trừ điểm');
      if (!acc[reason]) {
        acc[reason] = { reason, count: 0, totalPoints: 0 };
      }
      acc[reason].count++;
      acc[reason].totalPoints += Math.abs(h.change);
      return acc;
    }, {} as Record<string, ReasonStats>);

    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getAveragePointsTrend = () => {
    const dailyData: Record<string, { total: number; count: number }> = {};

    pointHistory.forEach(h => {
      const date = new Date(h.created_at).toLocaleDateString('vi-VN');
      if (!dailyData[date]) {
        dailyData[date] = { total: 0, count: 0 };
      }
      dailyData[date].total += h.points_after;
      dailyData[date].count++;
    });

    const sortedDates = Object.keys(dailyData).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });

    return {
      labels: sortedDates.slice(-14),
      data: sortedDates.slice(-14).map(date => Math.round(dailyData[date].total / dailyData[date].count))
    };
  };

  const getPointsDistribution = () => {
    const positive = pointHistory.filter(h => h.change > 0).reduce((sum, h) => sum + h.change, 0);
    const negative = Math.abs(pointHistory.filter(h => h.change < 0).reduce((sum, h) => sum + h.change, 0));
    return { positive, negative };
  };

  const levelDistribution = getLevelDistribution();
  const topPositiveReasons = getTopReasons(true);
  const topNegativeReasons = getTopReasons(false);
  const averageTrend = getAveragePointsTrend();
  const pointsDistribution = getPointsDistribution();

  const levelChartData = {
    labels: ['🌰 Hạt', '🌱 Nảy mầm', '🌿 Cây con', '🌳 Cây to'],
    datasets: [{
      label: 'Số học sinh',
      data: [levelDistribution.hat, levelDistribution.nay_mam, levelDistribution.cay_con, levelDistribution.cay_to],
      backgroundColor: [
        LEVEL_CONFIG.hat.color,
        LEVEL_CONFIG.nay_mam.color,
        LEVEL_CONFIG.cay_con.color,
        LEVEL_CONFIG.cay_to.color
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const trendChartData = {
    labels: averageTrend.labels,
    datasets: [{
      label: 'Điểm trung bình lớp',
      data: averageTrend.data,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const pieChartData = {
    labels: ['Điểm cộng', 'Điểm trừ'],
    datasets: [{
      data: [pointsDistribution.positive, pointsDistribution.negative],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      }
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Đang tải thống kê...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content statistics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Thống Kê Lớp Học</h2>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body statistics-body">
          <div className="stats-summary">
            <div className="stat-card">
              <Users className="stat-icon" />
              <div>
                <div className="stat-value">{students.length}</div>
                <div className="stat-label">Học sinh</div>
              </div>
            </div>
            <div className="stat-card">
              <TrendingUp className="stat-icon" />
              <div>
                <div className="stat-value">
                  {students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.total_points, 0) / students.length) : 0}
                </div>
                <div className="stat-label">Điểm TB</div>
              </div>
            </div>
            <div className="stat-card">
              <Award className="stat-icon" />
              <div>
                <div className="stat-value">{pointHistory.length}</div>
                <div className="stat-label">Lượt chấm</div>
              </div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-container">
              <h3>Phân bố Level</h3>
              <div className="chart-wrapper">
                <Bar data={levelChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-container">
              <h3>Xu hướng điểm trung bình (14 ngày gần nhất)</h3>
              <div className="chart-wrapper">
                <Line data={trendChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-container">
              <h3>Tỉ lệ điểm cộng vs trừ</h3>
              <div className="chart-wrapper">
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            </div>

            <div className="chart-container">
              <h3>Top 5 lý do cộng điểm</h3>
              <div className="reasons-list">
                {topPositiveReasons.length > 0 ? (
                  topPositiveReasons.map((r, i) => (
                    <div key={i} className="reason-item positive">
                      <span className="reason-rank">#{i + 1}</span>
                      <div className="reason-details">
                        <span className="reason-name">{r.reason}</span>
                        <span className="reason-stats">{r.count} lần • +{r.totalPoints} điểm</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            <div className="chart-container">
              <h3>Top 5 lý do trừ điểm</h3>
              <div className="reasons-list">
                {topNegativeReasons.length > 0 ? (
                  topNegativeReasons.map((r, i) => (
                    <div key={i} className="reason-item negative">
                      <span className="reason-rank">#{i + 1}</span>
                      <div className="reason-details">
                        <span className="reason-name">{r.reason}</span>
                        <span className="reason-stats">{r.count} lần • -{r.totalPoints} điểm</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-message">Chưa có dữ liệu</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
