import { useState, useEffect, memo, useCallback, useMemo, lazy, Suspense } from 'react';
import { Layout, Spin, message } from 'antd';
import Navigation from './components/Navigation';
import AuthModal from './components/AuthModal';
import { getSounds } from './services/api';
import { supabase, getUserProfile, signOut } from './services/supabase';
import { initAnalytics, endSession, trackPageView, resetAnalytics } from './services/analytics';

const { Content } = Layout;

const LearningSection = lazy(() => import('./components/LearningSection'));
const TestSection = lazy(() => import('./components/TestSection'));
const AIChatSection = lazy(() => import('./components/AIChatSection'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const TheorySection = lazy(() => import('./components/TheorySection'));

function App() {
  const [currentSection, setCurrentSection] = useState('learning');
  const [audioRecords, setAudioRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const profile = await getUserProfile();
        setUserProfile(profile);
        await initAnalytics();
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        (async () => {
          const profile = await getUserProfile();
          setUserProfile(profile);
          await initAnalytics();
        })();
      } else if (event === 'SIGNED_OUT') {
        (async () => {
          await endSession();
          resetAnalytics();
          setUser(null);
          setUserProfile(null);
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    const timer = setTimeout(loadRecords, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      trackPageView(currentSection);
    }
  }, [currentSection, user]);

  const handleSectionChange = useCallback((section) => {
    if ((section === 'chat' || section === 'test') && !user) {
      message.info('Для доступа к этому разделу необходимо войти в систему');
      setAuthModalOpen(true);
      return;
    }
    setCurrentSection(section);
  }, [user]);

  const handleRecordsUpdate = useCallback((records) => {
    setAudioRecords(records);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      message.success('Выход выполнен');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    const profile = await getUserProfile();
    setUserProfile(profile);
    await initAnalytics();
  }, []);

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
            <TheorySection />
          </Suspense>
        );
      case 'test':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TestSection audioRecords={audioRecords} />
          </Suspense>
        );
      case 'chat':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <AIChatSection />
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
  }, [currentSection, audioRecords, loading, handleRecordsUpdate]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navigation
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        user={userProfile || user}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <Content style={{ padding: '0 50px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {renderSection}
      </Content>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </Layout>
  );
}

export default memo(App);
