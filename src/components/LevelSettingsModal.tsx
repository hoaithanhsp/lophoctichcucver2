import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface LevelThresholds {
  hat: number;
  nay_mam: number;
  cay_con: number;
  cay_to: number;
}

interface LevelSettingsModalProps {
  onClose: () => void;
  onUpdate: () => void;
}

const STORAGE_KEY = 'classpoint_level_thresholds';

const INITIAL_THRESHOLDS: LevelThresholds = {
  hat: 0,
  nay_mam: 0,
  cay_con: 0,
  cay_to: 0
};

export default function LevelSettingsModal({ onClose, onUpdate }: LevelSettingsModalProps) {
  const [thresholds, setThresholds] = useState<LevelThresholds>(INITIAL_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    setLoading(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setThresholds(parsed);
      }
    } catch (err) {
      console.error('Lỗi khi load settings:', err);
    }
    setLoading(false);
  };

  const handleSave = () => {
    setSaving(true);

    // Auto-correct: đảm bảo thứ tự tăng dần
    let correctedThresholds = { ...thresholds };

    // Đảm bảo nay_mam >= 1
    if (correctedThresholds.nay_mam < 1) {
      correctedThresholds.nay_mam = 1;
    }

    // Đảm bảo cay_con > nay_mam
    if (correctedThresholds.cay_con <= correctedThresholds.nay_mam) {
      correctedThresholds.cay_con = correctedThresholds.nay_mam + 1;
    }

    // Đảm bảo cay_to > cay_con
    if (correctedThresholds.cay_to <= correctedThresholds.cay_con) {
      correctedThresholds.cay_to = correctedThresholds.cay_con + 1;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(correctedThresholds));
      console.log('Đã lưu thành công:', correctedThresholds);
      alert('Đã lưu cài đặt thành công!');
      setSaving(false);
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Lỗi:', err);
      alert('Lỗi khi lưu: ' + err.message);
      setSaving(false);
    }
  };

  const handleThresholdChange = (level: keyof LevelThresholds, value: string) => {
    const numValue = parseInt(value) || 0;
    setThresholds(prev => ({
      ...prev,
      [level]: Math.max(0, numValue)
    }));
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2>Đang tải...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Cài Đặt Mốc Điểm Level</h2>
          <button onClick={onClose} className="btn-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-intro">
            <p>Điều chỉnh số điểm cần thiết để đạt từng level. Các thay đổi sẽ áp dụng cho toàn bộ hệ thống.</p>
          </div>

          <div className="level-settings-grid">
            <div className="level-setting-item">
              <div className="level-setting-label">
                <span className="level-icon">🌰</span>
                <span className="level-name">Hạt</span>
              </div>
              <div className="level-setting-input">
                <input
                  type="number"
                  value={thresholds.hat}
                  onChange={(e) => handleThresholdChange('hat', e.target.value)}
                  min="0"
                  className="form-input"
                  disabled
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Cấp độ khởi đầu (0 điểm)</p>
            </div>

            <div className="level-setting-item">
              <div className="level-setting-label">
                <span className="level-icon">🌱</span>
                <span className="level-name">Nảy Mầm</span>
              </div>
              <div className="level-setting-input">
                <input
                  type="number"
                  value={thresholds.nay_mam}
                  onChange={(e) => handleThresholdChange('nay_mam', e.target.value)}
                  min="1"
                  className="form-input"
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Điểm tối thiểu để lên Nảy Mầm</p>
            </div>

            <div className="level-setting-item">
              <div className="level-setting-label">
                <span className="level-icon">🌿</span>
                <span className="level-name">Cây Con</span>
              </div>
              <div className="level-setting-input">
                <input
                  type="number"
                  value={thresholds.cay_con}
                  onChange={(e) => handleThresholdChange('cay_con', e.target.value)}
                  min="1"
                  className="form-input"
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Điểm tối thiểu để lên Cây Con</p>
            </div>

            <div className="level-setting-item">
              <div className="level-setting-label">
                <span className="level-icon">🌳</span>
                <span className="level-name">Cây To</span>
              </div>
              <div className="level-setting-input">
                <input
                  type="number"
                  value={thresholds.cay_to}
                  onChange={(e) => handleThresholdChange('cay_to', e.target.value)}
                  min="1"
                  className="form-input"
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Điểm tối thiểu để lên Cây To</p>
            </div>
          </div>

          <div className="settings-validation">
            {thresholds.nay_mam >= thresholds.cay_con && (
              <p className="validation-error">⚠️ Nảy Mầm phải nhỏ hơn Cây Con</p>
            )}
            {thresholds.cay_con >= thresholds.cay_to && (
              <p className="validation-error">⚠️ Cây Con phải nhỏ hơn Cây To</p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
