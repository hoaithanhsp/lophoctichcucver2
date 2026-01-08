import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { Reward } from '../lib/types';
import { supabase } from '../lib/supabase';

interface RewardsStoreProps {
  onClose: () => void;
  classId: string;
}

export default function RewardsStore({ onClose, classId }: RewardsStoreProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: 0,
    icon: '🎁'
  });

  useEffect(() => {
    loadRewards();
  }, [classId]);

  const loadRewards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('class_id', classId)
      .order('order_number');

    if (data) {
      setRewards(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.points_required <= 0) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    try {
      if (editingReward) {
        await supabase
          .from('rewards')
          .update({
            name: formData.name,
            description: formData.description,
            points_required: formData.points_required,
            icon: formData.icon
          })
          .eq('id', editingReward.id);
      } else {
        const maxOrder = rewards.length > 0 ? Math.max(...rewards.map(r => r.order_number)) : 0;
        await supabase
          .from('rewards')
          .insert({
            class_id: classId,
            name: formData.name,
            description: formData.description,
            points_required: formData.points_required,
            icon: formData.icon,
            order_number: maxOrder + 1,
            is_active: true
          });
      }

      setFormData({ name: '', description: '', points_required: 0, icon: '🎁' });
      setEditingReward(null);
      setShowForm(false);
      loadRewards();
    } catch (error) {
      console.error('Error saving reward:', error);
      alert('Có lỗi xảy ra!');
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      points_required: reward.points_required,
      icon: reward.icon
    });
    setShowForm(true);
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('Xác nhận xóa quà này?')) return;

    try {
      await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      loadRewards();
    } catch (error) {
      console.error('Error deleting reward:', error);
      alert('Có lỗi xảy ra!');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingReward(null);
    setFormData({ name: '', description: '', points_required: 0, icon: '🎁' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rewards-store-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cửa Hàng Quà</h2>
          <div className="header-actions">
            <button onClick={() => setShowForm(true)} className="btn-add">
              <Plus size={18} />
              Thêm quà
            </button>
            <button onClick={onClose} className="close-button">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {showForm && (
            <form onSubmit={handleSubmit} className="reward-form">
              <h3>{editingReward ? 'Sửa quà' : 'Thêm quà mới'}</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🎁"
                  />
                </div>

                <div className="form-group flex-grow">
                  <label>Tên quà *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên quà"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Số điểm *</label>
                  <input
                    type="number"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Nhập mô tả quà"
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={cancelForm} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  {editingReward ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <div className="rewards-list">
              {rewards.map((reward) => (
                <div key={reward.id} className="reward-item">
                  <div className="reward-item-icon">{reward.icon}</div>
                  <div className="reward-item-info">
                    <h4>{reward.name}</h4>
                    <p>{reward.description}</p>
                    <div className="reward-item-points">{reward.points_required} điểm</div>
                  </div>
                  <div className="reward-item-actions">
                    <button onClick={() => handleEdit(reward)} className="btn-icon">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(reward.id)} className="btn-icon btn-danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
