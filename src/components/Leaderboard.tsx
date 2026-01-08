import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { Student, LEVEL_CONFIG } from '../lib/types';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface LeaderboardProps {
  onClose: () => void;
  classId: string;
}

export default function Leaderboard({ onClose, classId }: LeaderboardProps) {
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [classId, filter]);

  const loadLeaderboard = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('total_points', { ascending: false })
      .limit(10);

    if (data) {
      setStudents(data);
    }

    setLoading(false);
  };

  const exportToExcel = () => {
    const exportData = students.map((student, index) => ({
      'Hạng': index + 1,
      'Tên học sinh': student.name,
      'Điểm': student.total_points,
      'Cấp độ': LEVEL_CONFIG[student.level].name
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng xếp hạng');

    const fileName = `bang-xep-hang-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bảng Xếp Hạng Top 10</h2>
          <div className="header-actions">
            <button onClick={exportToExcel} className="btn-export">
              <Download size={18} />
              Export Excel
            </button>
            <button onClick={onClose} className="close-button">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Cả năm
          </button>
          <button
            className={`filter-tab ${filter === 'month' ? 'active' : ''}`}
            onClick={() => setFilter('month')}
          >
            Tháng này
          </button>
          <button
            className={`filter-tab ${filter === 'week' ? 'active' : ''}`}
            onClick={() => setFilter('week')}
          >
            Tuần này
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <div className="leaderboard-table-container">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Học sinh</th>
                    <th>Điểm</th>
                    <th>Cấp độ</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const rank = index + 1;
                    const medal = getMedal(rank);
                    const levelConfig = LEVEL_CONFIG[student.level];

                    return (
                      <tr key={student.id} className={rank <= 3 ? 'top-three' : ''}>
                        <td className="rank-cell">
                          {medal || rank}
                        </td>
                        <td className="student-cell">
                          <div className="student-info">
                            {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="avatar-small" />
                            ) : (
                              <div className="avatar-small avatar-placeholder" style={{ backgroundColor: levelConfig.color }}>
                                {getInitials(student.name)}
                              </div>
                            )}
                            <span className="student-name-text">{student.name}</span>
                          </div>
                        </td>
                        <td className="points-cell">
                          <strong>{student.total_points}</strong>
                        </td>
                        <td className="level-cell">
                          <span className="level-badge-inline">
                            {levelConfig.icon} {levelConfig.name}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
