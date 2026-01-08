import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportExcelModalProps {
  onClose: () => void;
  onImport: (students: { name: string; orderNumber: number }[]) => Promise<void>;
}

export default function ImportExcelModal({ onClose, onImport }: ImportExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ name: string; orderNumber: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const students = jsonData.map((row: any, index) => {
        const name = row['Tên'] || row['Họ và tên'] || row['Name'] || row['Tên học sinh'] || '';
        const orderNumber = row['STT'] || row['Số thứ tự'] || index + 1;
        return { name: String(name).trim(), orderNumber: Number(orderNumber) || index + 1 };
      }).filter(s => s.name);

      setPreview(students);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      alert('Lỗi đọc file Excel! Vui lòng kiểm tra lại định dạng file.');
      setFile(null);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      alert('Không có dữ liệu để import!');
      return;
    }

    if (!confirm(`Xác nhận import ${preview.length} học sinh?`)) {
      return;
    }

    setLoading(true);
    try {
      await onImport(preview);
      onClose();
    } catch (error) {
      console.error('Error importing students:', error);
      alert('Có lỗi xảy ra khi import học sinh!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Danh Sách Excel</h2>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="import-instructions">
            <p>File Excel cần có cột "Tên" hoặc "Họ và tên" chứa tên học sinh.</p>
            <p>Có thể có thêm cột "STT" hoặc "Số thứ tự" (không bắt buộc).</p>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              id="fileInput"
              style={{ display: 'none' }}
              disabled={loading}
            />
            <label htmlFor="fileInput" className="file-upload-button">
              <Upload size={24} />
              {file ? file.name : 'Chọn file Excel'}
            </label>
          </div>

          {preview.length > 0 && (
            <div className="preview-section">
              <h3>Xem trước ({preview.length} học sinh)</h3>
              <div className="preview-list">
                {preview.slice(0, 10).map((student, index) => (
                  <div key={index} className="preview-item">
                    <span className="preview-number">{student.orderNumber}</span>
                    <span className="preview-name">{student.name}</span>
                  </div>
                ))}
                {preview.length > 10 && (
                  <div className="preview-more">
                    ... và {preview.length - 10} học sinh khác
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button onClick={onClose} className="btn-secondary" disabled={loading}>
                  Hủy
                </button>
                <button onClick={handleImport} className="btn-primary" disabled={loading}>
                  {loading ? 'Đang import...' : `Import ${preview.length} học sinh`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
