import { useState, useEffect, memo, useCallback, useMemo, lazy, Suspense } from 'react';
import { Layout, Spin, message } from 'antd';
import Navigation from './components/Navigation';
import ResetPasswordModal from './components/ResetPasswordModal';
import ParticipantModal from './components/ParticipantModal';
import { getSounds } from './services/api';
import { supabase } from './services/supabase';
import { getStoredParticipant, clearParticipant } from './services/participants';

const { Content } = Layout;

// Lazy load sections for better performance
const LearningSection = lazy(() => import('./components/LearningSection'));
const TestSection = lazy(() => import('./components/TestSection'));
const AIQuizSection = lazy(() => import('./components/AIQuizSection'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const TheorySection = lazy(() => import('./components/TheorySection'));
const SurveySection = lazy(() => import('./components/SurveySection'));
const ProfileSection = lazy(() => import('./components/ProfileSection'));
const AIChatSection = lazy(() => import('./components/AIChatSection'));


function App() {
  const [currentSection, setCurrentSection] = useState('learning');
  const [audioRecords, setAudioRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [participant, setParticipant] = useState(() => getStoredParticipant());

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Track auth state (for regular users)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load records in background
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await getSounds();
        setAudioRecords(records);
      } catch (error) {
        console.error('Error loading records:', error);
        message.error('Ошибка загрузки данных');
      }
    };

    // Start loading after a short delay to let UI render first
    const timer = setTimeout(loadRecords, 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize section change handler
  const handleSectionChange = useCallback((section) => {
    setCurrentSection(section);
  }, []);

  // Memoize records update handler
  const handleRecordsUpdate = useCallback((records) => {
    setAudioRecords(records);
  }, []);

  // Memoize rendered section
  const renderSection = useMemo(() => {
    if (loading) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '120px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid #f0f0f0',
            borderTop: '4px solid #1890ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ color: '#8c8c8c', fontSize: 14 }}>Загрузка данных...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    const LoadingFallback = () => (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );

    switch (currentSection) {
      case 'learning':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LearningSection audioRecords={audioRecords} />
          </Suspense>
        );
      case 'theory':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TheorySection user={user} participant={participant} />
          </Suspense>
        );
      case 'test':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TestSection audioRecords={audioRecords} user={user} participant={participant} />
          </Suspense>
        );
      case 'aiquiz':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AIQuizSection user={user} participant={participant} />
          </Suspense>
        );
      case 'chat':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AIChatSection user={user} participant={participant} />
          </Suspense>
        );
      case 'surveys':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SurveySection user={user} participant={participant} />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <ProfileSection user={user} participant={participant} />
          </Suspense>
        );
      case 'admin':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AdminPanel
              audioRecords={audioRecords}
              onAudioRecordsUpdate={handleRecordsUpdate}
            />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LearningSection audioRecords={audioRecords} />
          </Suspense>
        );
    }
  }, [currentSection, audioRecords, loading, handleRecordsUpdate, participant]);

  return (
    <Layout style={{ minHeight: '100vh' }}>

      <Navigation
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        user={user}
        participant={participant}
        onAuthClick={() => setShowAuthModal(true)}
        onSignOut={() => {
          // Sign out admin (Supabase auth)
          supabase.auth.signOut();
          // Clear participant session
          clearParticipant();
          setParticipant(null);
        }}
      />

      <Content style={{
        padding: isMobile ? '0 8px' : '0 24px',
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {renderSection}
      </Content>

      {/* Password reset modal — triggered by Supabase recovery link */}
      <ResetPasswordModal
        open={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
      />

      {/* Participant modal for anonymous entry */}
      <ParticipantModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onParticipantReady={(p) => { setParticipant(p); setShowAuthModal(false); }}
      />
    </Layout>
  );
}

export default memo(App);
