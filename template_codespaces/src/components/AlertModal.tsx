import * as Icons from "lucide-react";

export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  signature?: string;
  onClose: () => void;
}

export default function AlertModal({ isOpen, title, message, type, signature, onClose }: AlertModalProps) {
  if (!isOpen) return null;

  const bgGradient = 
    type === 'success' ? 'from-[#1D9E75]/30 to-[#0a1a18]' :
    type === 'error' || type === 'warning' ? 'from-[#E24B4A]/30 to-[#1a0a0a]' :
    'from-[#534AB7]/30 to-[#0d0d1e]';

  const IconObj = 
    type === 'success' ? Icons.CheckCircle :
    type === 'error' ? Icons.XCircle :
    type === 'warning' ? Icons.AlertTriangle :
    Icons.Info;

  const iconColor = 
    type === 'success' ? 'text-[#5DCAA5]' :
    type === 'error' || type === 'warning' ? 'text-[#E24B4A]' :
    'text-[#AFA9EC]';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-[400px] rounded-[24px] border border-[#2a2a4a]/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col`} style={{ background: '#0a0a14' }}>
        
        {/* Color Header glow */}
        <div className={`absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b ${bgGradient} opacity-50 pointer-events-none`}></div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col items-center text-center mt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 border border-[#2a2a4a] bg-[#000000]/50 shadow-inner`}>
            <IconObj size={32} className={iconColor} />
          </div>
          
          <h3 className="text-[20px] font-black text-white mb-3 leading-tight tracking-wide">{title}</h3>
          <p className="text-[13px] text-[#AFA9EC]/80 font-medium mb-6 leading-relaxed px-2 whitespace-pre-wrap">
            {message}
          </p>

          {signature && (
            <div className="w-full bg-[#000000] border border-[#1a1a2e] rounded-xl p-4 mb-6 flex flex-col items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#5DCAA5]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-[10px] text-[#AFA9EC]/60 uppercase tracking-[0.2em] font-bold mb-1.5 flex items-center gap-1.5">
                <Icons.Link size={10} /> Firma de Red
              </span>
              <a 
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} 
                target="_blank" 
                rel="noreferrer"
                className="text-[12px] font-mono text-[#5DCAA5] hover:text-[#7cf0c8] underline truncate w-full px-2 text-center"
              >
                {signature}
              </a>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full h-[48px] rounded-[16px] font-black text-[14px] text-white tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] shadow-lg"
            style={{
              background: type === 'success' ? '#1D9E75' : type === 'error' || type === 'warning' ? '#E24B4A' : '#534AB7',
              boxShadow: type === 'success' ? '0 10px 20px rgba(29,158,117,0.2)' : type === 'error' ? '0 10px 20px rgba(226,75,74,0.2)' : '0 10px 20px rgba(83,74,183,0.2)'
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
