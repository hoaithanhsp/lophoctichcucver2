import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Student, PointHistory, Reward, RewardRedemption } from '../lib/types';
import { supabase } from '../lib/supabase';

interface StudentModalProps {
  student: Student;
  onClose: () => void;
  onRedeemReward: (studentId: string, rewardId: string, pointsSpent: number) => Promise<void>;
  onDelete: (studentId: string) => Promise<void>;
}

export default function StudentModal({ student, onClose, onRedeemReward, onDelete }: StudentModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'rewards' | 'stats'>('history');
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<(RewardRedemption & { reward: Reward })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [student.id]);

  const loadData = async () => {
    setLoading(true);

    const [historyResult, rewardsResult, redemptionsResult] = await Promise.all([
      supabase
        .from('point_history')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(50),

      supabase
        .from('rewards')
        .select('*')
        .eq('class_id', student.class_id)
        .eq('is_active', true)
        .order('order_number'),

      supabase
        .from('reward_redemptions')
        .select('*, reward:rewards(*)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
    ]);

    if (historyResult.data) setPointHistory(historyResult.data);
    if (rewardsResult.data) setRewards(rewardsResult.data);
    if (redemptionsResult.data) setRedemptions(redemptionsResult.data as any);

    setLoading(false);
  };

  const handleRedeem = async (reward: Reward) => {
    if (student.total_points < reward.points_required) {
      alert('Không đủ điểm để đổi quà này!');
      return;
    }

    if (confirm(`Xác nhận đổi "${reward.name}" với ${reward.points_required} điểm?`)) {
      await onRedeemReward(student.id, reward.id, reward.points_required);
      await loadData();
    }
  };

  const handleDelete = async () => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${student.name}"?\n\nCảnh báo: Hành động này không thể hoàn tác và sẽ xóa toàn bộ lịch sử điểm của học sinh.`)) {
      await onDelete(student.id);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    totalAdded: pointHistory.filter(h => h.change > 0).reduce((sum, h) => sum + h.change, 0),
    totalDeducted: Math.abs(pointHistory.filter(h => h.change < 0).reduce((sum, h) => sum + h.change, 0)),
    rewardsCount: redemptions.length,
    totalSpent: redemptions.reduce((sum, r) => sum + r.points_spent, 0)
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{student.name}</h2>
          <div className="header-actions">
            <button onClick={handleDelete} className="btn-delete-student">
              <Trash2 size={18} />
              Xóa học sinh
            </button>
            <button onClick={onClose} className="close-button">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử điểm
          </button>
          <button
            className={`tab ${activeTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setActiveTab('rewards')}
          >
            Đổi quà
          </button>
          <button
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Thống kê
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <>
              {activeTab === 'history' && (
                <div className="history-tab">
                  {pointHistory.length === 0 ? (
                    <p className="empty-message">Chưa có lịch sử thay đổi điểm</p>
                  ) : (
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Thay đổi</th>
                          <th>Lý do</th>
                          <th>Điểm sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointHistory.map((history) => (
                          <tr key={history.id}>
                            <td>{formatDate(history.created_at)}</td>
                            <td className={history.change > 0 ? 'positive' : 'negative'}>
                              {history.change > 0 ? '+' : ''}{history.change}
                            </td>
                            <td>{history.reason || '-'}</td>
                            <td>{history.points_after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'rewards' && (
                <div className="rewards-tab">
                  <div className="current-points">
                    Điểm hiện tại: <strong>{student.total_points}</strong>
                  </div>
                  <div className="rewards-grid">
                    {rewards.map((reward) => {
                      const canAfford = student.total_points >= reward.points_required;
                      return (
                        <div key={reward.id} className={`reward-card ${canAfford ? 'affordable' : ''}`}>
                          <div className="reward-icon">{reward.icon}</div>
                          <h4>{reward.name}</h4>
                          <p className="reward-description">{reward.description}</p>
                          <div className="reward-cost">{reward.points_required} điểm</div>
                          <button
                            onClick={() => handleRedeem(reward)}
                            disabled={!canAfford}
                            className={`btn-redeem ${canAfford ? '' : 'disabled'}`}
                          >
                            {canAfford ? 'Đổi quà' : 'Chưa đủ điểm'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {redemptions.length > 0 && (
                    <div className="redemption-history">
                      <h3>Đã đổi</h3>
                      <ul>
                        {redemptions.map((redemption) => (
                          <li key={redemption.id}>
                            {redemption.reward.icon} {redemption.reward.name} - {redemption.points_spent} điểm
                            <span className="date">{formatDate(redemption.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="stats-tab">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalAdded}</div>
                      <div className="stat-label">Tổng điểm cộng</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalDeducted}</div>
                      <div className="stat-label">Tổng điểm trừ</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{student.total_points}</div>
                      <div className="stat-label">Điểm hiện tại</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.rewardsCount}</div>
                      <div className="stat-label">Số quà đã đổi</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalSpent}</div>
                      <div className="stat-label">Tổng điểm đã tiêu</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{pointHistory.length}</div>
                      <div className="stat-label">Số lần thay đổi</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
