import { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const DEFAULT_THRESHOLDS: LevelThresholds = {
  hat: 0,
  nay_mam: 50,
  cay_con: 100,
  cay_to: 200
};

export default function LevelSettingsModal({ onClose, onUpdate }: LevelSettingsModalProps) {
  const [thresholds, setThresholds] = useState<LevelThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'level_thresholds')
      .maybeSingle();

    if (data?.value) {
      setThresholds(data.value as LevelThresholds);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    await supabase
      .from('app_settings')
      .update({ value: thresholds })
      .eq('key', 'level_thresholds');

    setSaving(false);
    onUpdate();
    onClose();
  };

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
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
              <p className="level-setting-hint">Cấp độ khởi đầu (không thể thay đổi)</p>
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
              <p className="level-setting-hint">Điểm tối thiểu để đạt level này</p>
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
                  min={thresholds.nay_mam + 1}
                  className="form-input"
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Phải lớn hơn level Nảy Mầm</p>
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
                  min={thresholds.cay_con + 1}
                  className="form-input"
                />
                <span className="input-suffix">điểm</span>
              </div>
              <p className="level-setting-hint">Phải lớn hơn level Cây Con</p>
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
            onClick={handleReset}
            className="btn-secondary"
            disabled={saving}
          >
            <RotateCcw size={18} />
            Đặt lại mặc định
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={
              saving ||
              thresholds.nay_mam >= thresholds.cay_con ||
              thresholds.cay_con >= thresholds.cay_to
            }
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
