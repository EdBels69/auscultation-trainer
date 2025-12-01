import { useState, useEffect, memo, useCallback, useMemo, lazy, Suspense } from 'react';
import { Layout, Spin, message } from 'antd';
import Navigation from './components/Navigation';
import { getSounds } from './services/api';

const { Content } = Layout;

// Lazy load sections for better performance
const LearningSection = lazy(() => import('./components/LearningSection'));
const TestSection = lazy(() => import('./components/TestSection'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const TheorySection = lazy(() => import('./components/TheorySection'));

function App() {
  const [currentSection, setCurrentSection] = useState('learning');
  const [audioRecords, setAudioRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load records on mount
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const records = await getSounds();
        setAudioRecords(records);
      } catch (error) {
        console.error('Error loading records:', error);
        message.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
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
            <TheorySection />
          </Suspense>
        );
      case 'test':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <TestSection audioRecords={audioRecords} />
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
      />

      <Content style={{ padding: '0 50px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {renderSection}
      </Content>
    </Layout>
  );
}

export default memo(App);
