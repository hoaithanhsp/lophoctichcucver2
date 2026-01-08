import { useState } from 'react';
import { X } from 'lucide-react';

interface AddStudentModalProps {
  onClose: () => void;
  onAdd: (name: string, orderNumber: number) => Promise<void>;
}

export default function AddStudentModal({ onClose, onAdd }: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Vui lòng nhập tên học sinh!');
      return;
    }

    setLoading(true);
    try {
      await onAdd(name.trim(), parseInt(orderNumber) || 0);
      onClose();
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Có lỗi xảy ra khi thêm học sinh!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Thêm Học Sinh</h2>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-student-form">
          <div className="form-group">
            <label htmlFor="studentName">Tên học sinh *</label>
            <input
              id="studentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên học sinh"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="orderNumber">Số thứ tự</label>
            <input
              id="orderNumber"
              type="number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Nhập số thứ tự (tùy chọn)"
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang thêm...' : 'Thêm học sinh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
