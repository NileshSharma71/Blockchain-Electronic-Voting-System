import { useToasts } from '../hooks/useToast';

export default function ToastContainer() {
  const { list, dismiss } = useToasts();
  if (list.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map(toast => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          style={{
            padding: '10px 16px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            minWidth: 260,
            maxWidth: 360,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'slideIn 0.2s ease',
            background: toast.type === 'success' ? '#e8f5e9'
              : toast.type === 'error' ? '#ffebee'
              : '#fff8e1',
            border: `1px solid ${toast.type === 'success' ? '#4caf50'
              : toast.type === 'error' ? '#f44336'
              : '#ff9800'}`,
            color: toast.type === 'success' ? '#1b5e20'
              : toast.type === 'error' ? '#b71c1c'
              : '#e65100',
          }}
        >
          <span style={{ fontSize: 16 }}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <span style={{ opacity: 0.5, fontSize: 11 }}>✕</span>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
