import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, Pencil, Check } from 'lucide-react';
import { Class } from '../lib/types';
import { supabase } from '../lib/supabase';

interface ClassManagerProps {
  onClose: () => void;
  currentClassId: string;
  onClassChange: (classId: string) => void;
}

export default function ClassManager({ onClose, currentClassId, onClassChange }: ClassManagerProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);

    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (classesData) {
      setClasses(classesData);

      const counts: Record<string, number> = {};
      for (const cls of classesData) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        counts[cls.id] = count || 0;
      }
      setStudentCounts(counts);
    }

    setLoading(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newClassName.trim()) {
      alert('Vui lòng nhập tên lớp!');
      return;
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({ name: newClassName.trim() })
      .select()
      .single();

    if (data && !error) {
      setNewClassName('');
      setShowAddForm(false);
      await loadClasses();
      onClassChange(data.id);
    } else {
      alert('Có lỗi xảy ra khi tạo lớp!');
    }
  };

  const handleDeleteAllStudents = async (classId: string, className: string) => {
    const count = studentCounts[classId] || 0;

    if (count === 0) {
      alert('Lớp này không có học sinh nào!');
      return;
    }

    if (confirm(`Xác nhận xóa TẤT CẢ ${count} học sinh trong lớp "${className}"?\n\nCảnh báo: Hành động này không thể hoàn tác!`)) {
      await supabase
        .from('students')
        .delete()
        .eq('class_id', classId);

      await loadClasses();

      if (classId === currentClassId) {
        onClassChange(classId);
      }
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    const count = studentCounts[classId] || 0;

    if (count > 0) {
      alert('Không thể xóa lớp còn học sinh! Vui lòng xóa tất cả học sinh trước.');
      return;
    }

    if (confirm(`Xác nhận xóa lớp "${className}"?`)) {
      await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      await loadClasses();

      if (classId === currentClassId && classes.length > 1) {
        const remainingClass = classes.find(c => c.id !== classId);
        if (remainingClass) {
          onClassChange(remainingClass.id);
        }
      }
    }
  };

  const handleStartEdit = (classId: string, currentName: string) => {
    setEditingClassId(classId);
    setEditingClassName(currentName);
  };

  const handleCancelEdit = () => {
    setEditingClassId(null);
    setEditingClassName('');
  };

  const handleSaveEdit = async (classId: string) => {
    if (!editingClassName.trim()) {
      alert('Tên lớp không được để trống!');
      return;
    }

    const { error } = await supabase
      .from('classes')
      .update({ name: editingClassName.trim() })
      .eq('id', classId);

    if (!error) {
      setEditingClassId(null);
      setEditingClassName('');
      await loadClasses();
    } else {
      alert('Có lỗi xảy ra khi cập nhật tên lớp!');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content class-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Quản Lý Lớp Học</h2>
          <div className="header-actions">
            <button onClick={() => setShowAddForm(true)} className="btn-add">
              <Plus size={18} />
              Thêm lớp
            </button>
            <button onClick={onClose} className="close-button">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {showAddForm && (
            <form onSubmit={handleAddClass} className="add-class-form">
              <div className="form-group">
                <label htmlFor="className">Tên lớp mới</label>
                <input
                  id="className"
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="VD: Lớp 10A2"
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Tạo lớp
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <div className="classes-list">
              {classes.length === 0 ? (
                <p className="empty-message">Chưa có lớp học nào</p>
              ) : (
                classes.map((cls) => (
                  <div
                    key={cls.id}
                    className={`class-item ${cls.id === currentClassId ? 'active' : ''}`}
                  >
                    <div className="class-item-info" onClick={() => editingClassId !== cls.id && onClassChange(cls.id)}>
                      <div className="class-item-icon">
                        <Users size={24} />
                      </div>
                      <div className="class-item-details">
                        {editingClassId === cls.id ? (
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cls.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="edit-class-input"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3>{cls.name}</h3>
                        )}
                        <p>{studentCounts[cls.id] || 0} học sinh</p>
                      </div>
                      {cls.id === currentClassId && editingClassId !== cls.id && (
                        <span className="current-badge">Đang xem</span>
                      )}
                    </div>
                    <div className="class-item-actions">
                      {editingClassId === cls.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(cls.id)}
                            className="btn-icon btn-success"
                            title="Lưu"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-icon"
                            title="Hủy"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(cls.id, cls.name)}
                            className="btn-icon"
                            title="Sửa tên lớp"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAllStudents(cls.id, cls.name)}
                            className="btn-icon"
                            title="Xóa tất cả học sinh"
                            disabled={studentCounts[cls.id] === 0}
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="btn-icon btn-danger"
                            title="Xóa lớp"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
