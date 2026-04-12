'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface TopViewerProps {
  toast: Toast | null;
  onClose: () => void;
}

const TopViewer = ({ toast, onClose }: TopViewerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!isMounted || !toast) return null;

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#3b82f6';
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: isVisible ? '20px' : '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        transition: 'top 0.3s ease-in-out',
        maxWidth: '90%',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
      }}
    >
      {toast.message}
    </div>,
    document.body
  );
};

let toastId = 0;

export const useTopViewer = () => {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToast({
      id: `toast-${toastId++}`,
      message,
      type,
      duration,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const ToastComponent = useCallback(() => (
    <TopViewer toast={toast} onClose={closeToast} />
  ), [toast, closeToast]);

  return {
    showToast,
    ToastComponent,
  };
};

export default TopViewer;
