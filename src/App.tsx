import { useState, useEffect } from 'react';
import { Trophy, Settings, Download, Upload, Plus, Store, ChevronDown, BarChart3, LogOut, Sliders, Users } from 'lucide-react';
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

  const checkAuth = () => {
    const savedAuth = localStorage.getItem('classpoint_auth');
    if (savedAuth) {
      const { username } = JSON.parse(savedAuth);
      setCurrentUsername(username);
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setLoginError('');

    // Chỉ chấp nhận tài khoản cố định
    const validUsername = 'Trần Hoài Thanh';
    const validPassword = 'hoaithanha2';

    if (username.trim() === validUsername && password === validPassword) {
      localStorage.setItem('classpoint_auth', JSON.stringify({ username: username.trim() }));
      setCurrentUsername(username.trim());
      setIsAuthenticated(true);
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng!');
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
      // Only set currentClassId if not already set, or if it's invalid
      if (!currentClassId || !classesData.find(c => c.id === currentClassId)) {
        setCurrentClassId(classesData[0].id);
      }
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

  const handleImportStudents = async (studentsData: { name: string; orderNumber: number; className?: string }[]) => {
    try {
      // 1. Group students by class name
      const studentsByClass: Record<string, typeof studentsData> = {};
      const studentsNoClass: typeof studentsData = [];

      studentsData.forEach(s => {
        if (s.className && s.className.trim()) {
          const cName = s.className.trim();
          if (!studentsByClass[cName]) studentsByClass[cName] = [];
          studentsByClass[cName].push(s);
        } else {
          studentsNoClass.push(s);
        }
      });

      // 2. Process groups with explicit class name
      for (const [className, list] of Object.entries(studentsByClass)) {
        // Find existing class or create new one
        let targetClassId = classes.find(c => c.name.toLowerCase() === className.toLowerCase())?.id;

        if (!targetClassId) {
          // Create new class
          const { data: newClass, error: createError } = await supabase
            .from('classes')
            .insert({ name: className })
            .select()
            .single();

          if (createError) throw createError;
          targetClassId = newClass.id;
        }

        // Insert students into this class
        const insertData = list.map(s => ({
          class_id: targetClassId!,
          name: s.name,
          order_number: s.orderNumber,
          total_points: 0,
          level: 'hat' as const,
          avatar: null
        }));

        const { error: insertError } = await supabase.from('students').insert(insertData);
        if (insertError) throw insertError;
      }

      // 3. Process students without class (use current selected class)
      if (studentsNoClass.length > 0) {
        if (!currentClassId) throw new Error("Vui lòng chọn lớp học để import các học sinh không có thông tin lớp.");

        const insertData = studentsNoClass.map(s => ({
          class_id: currentClassId,
          name: s.name,
          order_number: s.orderNumber,
          total_points: 0,
          level: 'hat' as const,
          avatar: null
        }));

        const { error: insertError } = await supabase.from('students').insert(insertData);
        if (insertError) throw insertError;
      }

      // 4. Refresh data
      await initializeApp();
      await loadData();
      alert(`Đã thêm thành công ${studentsData.length} học sinh!`);
    } catch (error: any) {
      console.error('Import failed:', error);
      alert(`Lỗi khi import: ${error.message}`);
      throw error;
    }
  };

  const handleClassChange = async (classId: string) => {
    setCurrentClassId(classId);
    setShowClassManager(false);
  };

  const handleExportData = () => {
    const exportData = students.map(student => ({
      'STT': student.order_number,
      'Tên học sinh': student.name,
      'Điểm hiện tại': student.total_points,
      'Cấp độ': student.level
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh');

    const className = currentClass?.name || 'class';
    const fileName = `danh-sach-${className.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
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

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-300">
              <Users size={48} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có học sinh nào</h3>
            <p className="text-gray-500 max-w-sm mb-8">Hãy bắt đầu bằng cách thêm học sinh hoặc nhập danh sách từ file Excel.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowAddStudent(true)} className="px-6 py-3 bg-primary-green text-white rounded-xl font-bold shadow-lg hover:bg-green-600 transition-all">
                Thêm học sinh đầu tiên
              </button>
              <button onClick={() => setShowImportExcel(true)} className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                <Upload size={18} /> Import Excel
              </button>
            </div>
          </div>
        ) : (
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
        )}
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