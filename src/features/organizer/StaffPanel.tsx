'use client';
import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import PageNav from "../../components/layout/PageNav";
import "./StaffScanner.css";
import { CreatedEvent } from "./CreateEvent";
import { Scanner } from '@yudiel/react-qr-scanner';

export default function StaffPanel({ event, stats, onCheckIn, onBack, isPwa = false }: { event?: CreatedEvent, stats?: {sold: number, checked: number}, onCheckIn?: () => void, onBack: () => void, isPwa?: boolean }) {
  // Estados principales del escáner
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [filterText, setFilterText] = useState('');
  
  // Contadores de estadísticas
  const okCount = stats?.checked || 0;
  
  // Estado para el overlay de resultados flotante
  const [resultData, setResultData] = useState<{
    show: boolean;
    type: 'valid' | 'invalid' | 'duplicate';
    bg: string;
    iconBg: string;
    label: string;
    sub: string;
    svg: React.ReactNode;
  } | null>(null);

  // Historial de logs con persistencia en localStorage
  const LS_LOGS_KEY = `mintpass_staff_logs_${event?.id || 0}`;
  const [logs, setLogs] = useState<Array<{
    dotClass: string;
    addr: string;
    mint?: string;
    statusClass: string;
    statusText: string;
    time: string;
  }>>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_LOGS_KEY) : null;
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const filteredLogs = logs.filter(log => log.addr.toLowerCase().includes(filterText.toLowerCase()) || log.statusText.toLowerCase().includes(filterText.toLowerCase()));

  const errCount = logs.filter(l => l.statusClass === 'ls-err').length;
  const dupCount = logs.filter(l => l.statusClass === 'ls-dup').length;

  // Tipos de resultados para la simulación (Diccionario de respuestas UI)
  const resultTypes = {
    valid: {
      bg: '#000d0a', iconBg: 'ri-valid', label: 'Acceso concedido', sub: 'Zona VIP',
      svg: <path d="M8 26L14 20L26 10" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
      dotClass: 'ld-ok', statusClass: 'ls-ok', statusText: 'Válido'
    },
    invalid: {
      bg: '#1a0000', iconBg: 'ri-invalid', label: 'Acceso denegado', sub: 'Boleto inválido',
      svg: <path d="M10 10l12 12M22 10L10 22" stroke="#F09595" strokeWidth="3" strokeLinecap="round" fill="none"/>,
      dotClass: 'ld-err', statusClass: 'ls-err', statusText: 'Inválido'
    },
    duplicate: {
      bg: '#1a0f00', iconBg: 'ri-repeat', label: 'Ya ingresó', sub: 'Boleto duplicado',
      svg: <path d="M16 8v8M16 20v2" stroke="#FAC775" strokeWidth="3" strokeLinecap="round" fill="none"/>,
      dotClass: 'ld-dup', statusClass: 'ls-dup', statusText: 'Duplicado'
    }
  };

  // Función para agregar un nuevo registro al log superior
  const addLog = (rType: keyof typeof resultTypes, realMintAddress?: string) => {
    const r = resultTypes[rType];
    let addr = '';
    
    if (realMintAddress) {
      addr = realMintAddress.substring(0, 5) + '...' + realMintAddress.substring(realMintAddress.length - 4);
    } else {
      const addrs = ['#0842','#0839','#0801','#0798','#0795'];
      const suffs = ['Zona VIP','Preferente','General','Platea','General'];
      const idx = Math.floor(Math.random() * addrs.length);
      addr = `${addrs[idx]} · ${suffs[idx]}`;
    }
    
    const now = new Date();
    const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    
    setLogs(prev => [
      { dotClass: r.dotClass, addr, mint: realMintAddress, statusClass: r.statusClass, statusText: r.statusText, time },
      ...prev
    ]);
  };

  // Función para feedback de hardware
  const triggerFeedback = (isValid: boolean) => {
    try {
      if (isValid) {
        if (navigator.vibrate) navigator.vibrate(50);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Ignorar si el navegador bloquea el audio
    }
  };

  // Función para alternar linterna manualmente obteniendo el track de video activo
  const toggleTorch = async () => {
    try {
      const video = document.querySelector('video');
      if (!video || !video.srcObject) return;
      const track = (video.srcObject as MediaStream).getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ((capabilities as any).torch) {
          const currentTorch = (track.getSettings() as any).torch || false;
          await track.applyConstraints({
            advanced: [{ torch: !currentTorch }]
          } as any);
          setTorchOn(!currentTorch);
        } else {
          console.warn("El dispositivo no soporta linterna.");
        }
      }
    } catch (e) {
      console.error("Error activando linterna:", e);
    }
  };

  // Función central para simular el escaneo de un código
  const simulate = (type: keyof typeof resultTypes, mintAddress?: string) => {
    const r = resultTypes[type];

    triggerFeedback(type === 'valid');

    // Mostramos overlay de resultado
    setResultData({
      show: true,
      type,
      bg: r.bg,
      iconBg: r.iconBg,
      label: r.label,
      sub: r.sub,
      svg: r.svg
    });

    // Actualizamos estadísticas globales (si es válido)
    if (type === 'valid') {
       if (onCheckIn) onCheckIn();
    }

    addLog(type, mintAddress);

    // Ocultamos el overlay tras 2.2s volviendo al estado original de cámara
    setTimeout(() => {
      setResultData(prev => prev ? { ...prev, show: false } : null);
      setScanning(true);
    }, 2200);
  };

  const [isRelaying, setIsRelaying] = useState(false);

  // Interceptar la salida para dar tiempo a la liberación de cámara
  const handleBack = () => {
    setScanning(false);
    setTimeout(onBack, 400); 
  };

  const verifyTicket = async (mintToVerify: string) => {
    setScanning(false); 
    setIsRelaying(true);
    
    // Extraemos el mint si viene dentro de nuestro JSON cryptoPayload
    let targetMint = mintToVerify;
    try {
      const parsed = JSON.parse(mintToVerify);
      if (parsed.mint) targetMint = parsed.mint;
    } catch(e) { }
    
    // Simulación del backend (Relayer)
    setTimeout(() => {
      setIsRelaying(false);
      
      // Simulamos la respuesta (aleatoria para el demo: 80% éxito, 10% inválido, 10% duplicado)
      const rand = Math.random();
      if (rand > 0.2) simulate('valid', targetMint);
      else if (rand > 0.1) simulate('duplicate', targetMint);
      else simulate('invalid', targetMint);
    }, 800);
  };

  return (
    <div className="app min-h-screen text-white font-sans" style={{ background: 'var(--color-background-primary)' }}>
      <style>{`
        /* Yudiel Scanner Override styles */
        video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
      
      {/* ======= NAVBAR OSCURO PARA STAFF ======= */}
      {!isPwa && (
        <div style={{ position: 'relative', zIndex: 10, background: 'var(--color-background-primary)' }}>
          <PageNav 
            title="Panel de Staff" 
          />
        </div>
      )}

      {/* Relayer Loading Indicator */}
      {isRelaying && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
          <Icons.Loader2 size={48} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: '#14F195' }} />
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Procesando (Relayer)...</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#A0A0A0' }}>Mintpass pagando el gas en Solana</p>
        </div>
      )}

      {/* ======= CONTENEDOR PRINCIPAL ======= */}
      <div className="scanner-container" style={{ padding: '20px 16px' }}>
        
        {/* ESCÁNER */}
        <p className="scanner-title">Escáner con contador de aforo</p>
        <div className="scanner-card-new">
          <div className="scanner-header-new">
            <span className="scanner-guard">Guardia 2 · {event?.venue || "Sonora Norte"}</span>
            <span className="scanner-status" style={{ color: isOnline ? '#5DCAA5' : '#E38C7A' }}>
              <span className="scanner-status-dot" style={{ background: isOnline ? '#5DCAA5' : '#E38C7A' }}></span>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
          </div>

          <div className="scanner-progress-area">
            <div className="scanner-progress-text">
              <span className="scanner-count-main">{okCount}<span className="scanner-count-sub"> / {event?.aforo || 500} escaneados</span></span>
              <span className="scanner-pct">{Math.round((okCount / (event?.aforo || 500)) * 100)}%</span>
            </div>
            <div className="scanner-track">
              <div className="scanner-fill" style={{ width: `${Math.round((okCount / (event?.aforo || 500)) * 100)}%` }}></div>
            </div>
          </div>

          <div className="scanner-camera-area">
            {/* Contenedor nativo del flujo de video usando react-qr-scanner */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: (!resultData?.show && scanning) ? 1 : 0 }}>
              {scanning && !resultData?.show && (
                <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0 && result[0].rawValue) {
                      verifyTicket(result[0].rawValue);
                    }
                  }}
                  components={{ finder: false, torch: false }}
                  styles={{ videoContainer: { width: '100%', height: '100%', objectFit: 'cover' } } as any}
                />
              )}
            </div>

            <span className="scanner-camera-hint" style={{ opacity: resultData?.show ? 0 : 1 }}>Apunta al QR del boleto</span>
          </div>

          {resultData?.show ? (
            <div className={`scanner-result-overlay ${resultData.type === 'valid' ? 'success' : resultData.type === 'invalid' ? 'error' : 'duplicate'}`}>
              <span className={`scanner-result-icon ${resultData.type === 'valid' ? 'success' : resultData.type === 'invalid' ? 'error' : 'duplicate'}`}>
                {resultData.type === 'valid' ? '✓' : resultData.type === 'invalid' ? '✕' : '⚠'}
              </span>
              <p className={`scanner-result-title ${resultData.type === 'valid' ? 'success' : resultData.type === 'invalid' ? 'error' : 'duplicate'}`}>{resultData.label}</p>
              <p className={`scanner-result-sub ${resultData.type === 'valid' ? 'success' : resultData.type === 'invalid' ? 'error' : 'duplicate'}`}>{resultData.sub}</p>
            </div>
          ) : (
            <div className="scanner-action-area" style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <button className="scanner-action-btn" style={{ flex: 1 }} onClick={() => setScanning(!scanning)}>
                {scanning ? 'Pausar escáner' : 'Activar escáner'}
              </button>
              <button 
                className="scanner-action-btn" 
                style={{ 
                  width: '48px', 
                  flexShrink: 0, 
                  padding: '0', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  background: torchOn ? '#14F195' : 'var(--color-background-tertiary)', 
                  color: torchOn ? '#1E1E1E' : '#FFF' 
                }}
                onClick={toggleTorch}
              >
                <Icons.Flashlight size={20} />
              </button>
            </div>
          )}

          {/* Separador para el historial integrado */}
          <div style={{ height: '1px', background: 'var(--color-border-tertiary)', margin: '16px 0 12px' }}></div>
          
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                Historial de escaneos recientes
              </p>
              <input 
                type="text" 
                placeholder="Filtrar..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                style={{ background: 'var(--color-background-tertiary)', border: '1px solid var(--color-border-secondary)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#FFF', width: '100px' }}
              />
            </div>
            
            <div className="history-list" style={{ maxHeight: '240px', padding: 0, margin: '0 -18px' }}>
              {filteredLogs.length === 0 ? (
                <div style={{padding: '16px', textAlign: 'center', fontSize: '12px', color: '#555'}}>Sin registros encontrados</div>
              ) : (
                filteredLogs.map((log, i) => {
                  let type = 'success';
                  let icon = '✓';
                  if (log.statusClass === 'ls-err') { type = 'error'; icon = '✕'; }
                  if (log.statusClass === 'ls-dup') { type = 'duplicate'; icon = '⚠'; }

                  return (
                    <div className={`history-item ${type}`} key={i}>
                      <span className={`history-icon ${type}`}>{icon}</span>
                      <div className="history-item-details">
                        <p className={`history-item-text ${type}`}>{log.addr}</p>
                      </div>
                      <span className={`history-item-time ${type}`}>{log.time}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
