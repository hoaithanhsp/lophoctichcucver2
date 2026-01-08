import { useState } from 'react';
import { Student, LEVEL_CONFIG, getProgressToNextLevel } from '../lib/types';

interface StudentCardProps {
  student: Student;
  onPointChange: (studentId: string, change: number, reason?: string) => Promise<void>;
  onClick: () => void;
}

export default function StudentCard({ student, onPointChange, onClick }: StudentCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationValue, setAnimationValue] = useState<string>('');

  const levelConfig = LEVEL_CONFIG[student.level];
  const progress = getProgressToNextLevel(student.total_points, student.level);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleQuickPoint = async (change: number) => {
    if (change < 0) {
      const reason = prompt('Lý do trừ điểm (bắt buộc):');
      if (!reason || reason.trim() === '') {
        alert('Vui lòng nhập lý do trừ điểm!');
        return;
      }
      await onPointChange(student.id, change, reason);
    } else {
      const reason = prompt('Lý do cộng điểm (không bắt buộc):');
      await onPointChange(student.id, change, reason || undefined);
    }

    setAnimationValue(change > 0 ? `+${change}` : `${change}`);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  return (
    <div
      className="student-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {isAnimating && (
        <div className={`point-animation ${animationValue.startsWith('+') ? 'positive' : 'negative'}`}>
          {animationValue}
        </div>
      )}

      <div className="level-badge">
        {levelConfig.icon}
      </div>

      <div className="avatar">
        {student.avatar ? (
          <img src={student.avatar} alt={student.name} />
        ) : (
          <div className="avatar-placeholder" style={{ backgroundColor: levelConfig.color }}>
            {getInitials(student.name)}
          </div>
        )}
      </div>

      <h3 className="student-name">{student.name}</h3>

      <div className="points-display">{student.total_points}</div>

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        {progress.pointsNeeded > 0 ? (
          <p className="progress-text">
            {student.total_points}/{LEVEL_CONFIG[student.level].maxPoints + 1} - Còn {progress.pointsNeeded} điểm lên {LEVEL_CONFIG[Object.keys(LEVEL_CONFIG)[Object.keys(LEVEL_CONFIG).indexOf(student.level) + 1] as keyof typeof LEVEL_CONFIG]?.name}
          </p>
        ) : (
          <p className="progress-text">Đã đạt cấp cao nhất!</p>
        )}
      </div>

      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
        <div className="button-group positive">
          <button onClick={() => handleQuickPoint(1)} className="btn-point btn-positive">+1</button>
          <button onClick={() => handleQuickPoint(2)} className="btn-point btn-positive">+2</button>
          <button onClick={() => handleQuickPoint(5)} className="btn-point btn-positive">+5</button>
        </div>
        <div className="button-group negative">
          <button onClick={() => handleQuickPoint(-1)} className="btn-point btn-negative">-1</button>
          <button onClick={() => handleQuickPoint(-2)} className="btn-point btn-negative">-2</button>
          <button onClick={() => handleQuickPoint(-5)} className="btn-point btn-negative">-5</button>
        </div>
      </div>
    </div>
  );
}
