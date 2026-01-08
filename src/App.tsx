import { useState, useEffect } from 'react';
import { Trophy, Settings, Download, Upload, Plus, Store, ChevronDown, BarChart3, LogOut, Sliders } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Student, Class, getLevelFromPoints, LevelThresholds } from './lib/types';
import StudentCard from './components/StudentCard';
import StudentModal from './components/StudentModal';
import Leaderboard from './components/Leaderboard';
import AddStudentModal from './components/AddStudentModal';
import ImportExcelModal from './components/ImportExcelModal';
import RewardsStore from './components/RewardsStore';
import ClassManager from './components/ClassManager';
import Statistics from './components/Statistics';
import LoginScreen from './components/LoginScreen';
import LevelSettingsModal from './components/LevelSettingsModal';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [showRewardsStore, setShowRewardsStore] = useState(false);
  const [showClassManager, setShowClassManager] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showLevelSettings, setShowLevelSettings] = useState(false);
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'order'>('points');
  const [loading, setLoading] = useState(true);
  const [levelThresholds, setLevelThresholds] = useState<LevelThresholds>({
    hat: 0,
    nay_mam: 50,
    cay_con: 100,
    cay_to: 200
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      initializeApp();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentClassId && isAuthenticated) {
      loadData();
    }
  }, [currentClassId, isAuthenticated]);

  const checkAuth = async () => {
    const savedAuth = localStorage.getItem('classpoint_auth');
    if (savedAuth) {
      const { username, password } = JSON.parse(savedAuth);
      
      // Xác minh lại với database
      const { data } = await supabase
        .from('auth_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (data) {
        setCurrentUsername(username);
        setIsAuthenticated(true);
      } else {
        // Session không hợp lệ - xóa và yêu cầu đăng nhập lại
        localStorage.removeItem('classpoint_auth');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (username: string, password: string) => {
    setLoginError('');

    // Kiểm tra xem user đã tồn tại chưa
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      // User đã tồn tại - kiểm tra password
      if (existingUser.password === password) {
        localStorage.setItem('classpoint_auth', JSON.stringify({ username, password }));
        setCurrentUsername(username);
        setIsAuthenticated(true);
      } else {
        setLoginError('Mật khẩu không đúng! Vui lòng nhập đúng mật khẩu đã đăng ký.');
      }
    } else {
      // User mới - tạo tài khoản và đăng nhập
      await supabase
        .from('auth_users')
        .insert({ username, password });
      
      localStorage.setItem('classpoint_auth', JSON.stringify({ username, password }));
      setCurrentUsername(username);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('classpoint_auth');
    setIsAuthenticated(false);
    setCurrentUsername('');
    setStudents([]);
    setClasses([]);
    setCurrentClassId('');
  };

  const loadLevelThresholds = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'level_thresholds')
      .maybeSingle();

    if (data?.value) {
      setLevelThresholds(data.value as LevelThresholds);
    }
  };

  const initializeApp = async () => {
    setLoading(true);

    await loadLevelThresholds();

    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (classesData && classesData.length > 0) {
      setClasses(classesData);
      setCurrentClassId(classesData[0].id);
    } else {
      const { data: newClass } = await supabase
        .from('classes')
        .insert({ name: 'Lớp học của tôi' })
        .select()
        .single();

      if (newClass) {
        setClasses([newClass]);
        setCurrentClassId(newClass.id);
      }
    }

    setLoading(false);
  };

  const loadData = async () => {
    if (!currentClassId) return;

    const [classResult, studentsResult] = await Promise.all([
      supabase.from('classes').select('*').eq('id', currentClassId).maybeSingle(),
      supabase.from('students').select('*').eq('class_id', currentClassId)
    ]);

    if (classResult.data) {
      setCurrentClass(classResult.data);
    }

    if (studentsResult.data) {
      setStudents(studentsResult.data);
    }
  };

  const handlePointChange = async (studentId: string, change: number, reason?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newPoints = Math.max(0, student.total_points + change);
    const oldLevel = student.level;
    const newLevel = getLevelFromPoints(newPoints, levelThresholds);

    await supabase
      .from('students')
      .update({
        total_points: newPoints,
        level: newLevel
      })
      .eq('id', studentId);

    await supabase
      .from('point_history')
      .insert({
        student_id: studentId,
        change,
        reason: reason || null,
        points_after: newPoints
      });

    if (newLevel !== oldLevel && change > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        alert(`🎉 Chúc mừng ${student.name} lên cấp ${newLevel.toUpperCase()}!`);
      }, 300);
    }

    await loadData();
  };

  const handleRedeemReward = async (studentId: string, rewardId: string, pointsSpent: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student || student.total_points < pointsSpent) return;

    const newPoints = student.total_points - pointsSpent;
    const newLevel = getLevelFromPoints(newPoints, levelThresholds);

    await supabase
      .from('students')
      .update({
        total_points: newPoints,
        level: newLevel
      })
      .eq('id', studentId);

    await supabase
      .from('reward_redemptions')
      .insert({
        student_id: studentId,
        reward_id: rewardId,
        points_spent: pointsSpent
      });

    await supabase
      .from('point_history')
      .insert({
        student_id: studentId,
        change: -pointsSpent,
        reason: 'Đổi quà',
        points_after: newPoints
      });

    await loadData();
  };

  const handleDeleteStudent = async (studentId: string) => {
    await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    await loadData();
  };

  const handleAddStudent = async (name: string, orderNumber: number) => {
    await supabase
      .from('students')
      .insert({
        class_id: currentClassId,
        name,
        order_number: orderNumber,
        total_points: 0,
        level: 'hat',
        avatar: null
      });

    await loadData();
  };

  const handleImportStudents = async (studentsData: { name: string; orderNumber: number }[]) => {
    const insertData = studentsData.map(s => ({
      class_id: currentClassId,
      name: s.name,
      order_number: s.orderNumber,
      total_points: 0,
      level: 'hat' as const,
      avatar: null
    }));

    await supabase
      .from('students')
      .insert(insertData);

    await loadData();
  };

  const handleClassChange = async (classId: string) => {
    setCurrentClassId(classId);
    setShowClassManager(false);
  };

  const handleExportData = () => {
    const exportData = students.map(student => ({
      'Tên': student.name,
      'Số thứ tự': student.order_number,
      'Điểm hiện tại': student.total_points,
      'Cấp độ': student.level
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh');

    const fileName = `danh-sach-hoc-sinh-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getSortedStudents = () => {
    const sorted = [...students];
    switch (sortBy) {
      case 'points':
        return sorted.sort((a, b) => b.total_points - a.total_points);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      case 'order':
        return sorted.sort((a, b) => a.order_number - b.order_number);
      default:
        return sorted;
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">LỚP HỌC TÍCH CỰC</h1>
            <button onClick={() => setShowClassManager(true)} className="class-selector">
              <span>{currentClass?.name || 'Chọn lớp'}</span>
              <ChevronDown size={18} />
            </button>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="username">{currentUsername}</span>
            </div>
            <button onClick={() => setShowStatistics(true)} className="btn-header">
              <BarChart3 size={18} />
              Thống kê
            </button>
            <button onClick={() => setShowLeaderboard(true)} className="btn-header">
              <Trophy size={18} />
              Bảng xếp hạng
            </button>
            <button onClick={() => setShowRewardsStore(true)} className="btn-header">
              <Store size={18} />
              Cửa hàng quà
            </button>
            <button onClick={() => setShowLevelSettings(true)} className="btn-header">
              <Sliders size={18} />
              Cài đặt điểm
            </button>
            <button onClick={() => setShowClassManager(true)} className="btn-header">
              <Settings size={18} />
              Quản lý lớp
            </button>
            <button onClick={handleLogout} className="btn-header btn-logout">
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="toolbar">
          <div className="sort-buttons">
            <span className="sort-label">Sắp xếp:</span>
            <button
              className={`btn-sort ${sortBy === 'points' ? 'active' : ''}`}
              onClick={() => setSortBy('points')}
            >
              Điểm cao
            </button>
            <button
              className={`btn-sort ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              Tên A-Z
            </button>
            <button
              className={`btn-sort ${sortBy === 'order' ? 'active' : ''}`}
              onClick={() => setSortBy('order')}
            >
              Số thứ tự
            </button>
          </div>
        </div>

        <div className="students-grid">
          {getSortedStudents().map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onPointChange={handlePointChange}
              onClick={() => setSelectedStudent(student)}
            />
          ))}
        </div>
      </main>

      <footer className="footer">
        <button onClick={() => setShowAddStudent(true)} className="btn-footer">
          <Plus size={18} />
          Thêm học sinh
        </button>
        <button onClick={() => setShowImportExcel(true)} className="btn-footer">
          <Upload size={18} />
          Import Excel
        </button>
        <button onClick={handleExportData} className="btn-footer">
          <Download size={18} />
          Export dữ liệu
        </button>
      </footer>

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onRedeemReward={handleRedeemReward}
          onDelete={handleDeleteStudent}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          classId={currentClassId}
        />
      )}

      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onAdd={handleAddStudent}
        />
      )}

      {showImportExcel && (
        <ImportExcelModal
          onClose={() => setShowImportExcel(false)}
          onImport={handleImportStudents}
        />
      )}

      {showRewardsStore && (
        <RewardsStore
          onClose={() => setShowRewardsStore(false)}
          classId={currentClassId}
        />
      )}

      {showClassManager && (
        <ClassManager
          onClose={() => setShowClassManager(false)}
          currentClassId={currentClassId}
          onClassChange={handleClassChange}
        />
      )}

      {showStatistics && (
        <Statistics
          onClose={() => setShowStatistics(false)}
          classId={currentClassId}
        />
      )}

      {showLevelSettings && (
        <LevelSettingsModal
          onClose={() => setShowLevelSettings(false)}
          onUpdate={() => {
            loadLevelThresholds();
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default App;
