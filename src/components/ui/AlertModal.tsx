'use client';
import * as Icons from "lucide-react";

export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  signature?: string;
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
}

export default function AlertModal({ isOpen, title, message, type, signature, actionText, onAction, onClose }: AlertModalProps) {
  if (!isOpen) return null;

  const IconObj = 
    type === 'success' ? Icons.Check :
    type === 'error' ? Icons.X :
    type === 'warning' ? Icons.AlertTriangle :
    Icons.Info;

  const iconColor = 
    type === 'success' ? '#27500A' :
    type === 'error' ? '#B0523E' :
    type === 'warning' ? '#BA7517' :
    '#3C3489';

  const iconBg = 
    type === 'success' ? '#EAF3DE' :
    type === 'error' ? '#FADCD5' :
    type === 'warning' ? '#FBEFDD' :
    '#EEEDFE';
    
  const btnBg = 
    type === 'success' || type === 'info' ? '#14F195' :
    '#1E1E1E';
    
  const btnColor = 
    type === 'success' || type === 'info' ? '#1E1E1E' :
    '#FFFFFF';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(30,30,30,0.45)', backdropFilter: 'blur(4px)' }} className="animate-in fade-in duration-200">
      <div style={{ width: '100%', maxWidth: '360px', background: '#FFFFFF', borderRadius: '18px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span onClick={onClose} style={{ fontSize: '14px', color: '#5F5E5A', cursor: 'pointer', userSelect: 'none' }}>✕</span>
        </div>

        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <IconObj size={24} color={iconColor} strokeWidth={2.5} />
        </div>
        
        <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#1E1E1E', textAlign: 'center' }}>
          {title}
        </p>
        
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#5F5E5A', textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>

        {signature && (
          <div style={{ background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', padding: '14px', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#5F5E5A', fontWeight: 500, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Link size={14} /> Firma de Red
            </span>
            <a 
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#3C3489', textDecoration: 'none', display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}
            >
              {signature}
            </a>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {actionText && onAction && (
            <button 
              onClick={onClose}
              style={{ flex: 1, border: '1px solid #D3D1C7', color: '#1E1E1E', textAlign: 'center', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, background: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              Cancelar
            </button>
          )}
          <button 
            onClick={actionText && onAction ? onAction : onClose}
            style={{ flex: 1, background: btnBg, color: btnColor, textAlign: 'center', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            {actionText || 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
}

