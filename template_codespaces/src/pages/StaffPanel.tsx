import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import PageNav from "../components/PageNav";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { createCheckInPDA } from "../lib/checkin-pda";
import { CreatedEvent } from "./CreateEvent";
import { Html5Qrcode } from "html5-qrcode";
import "../index.css";

export default function StaffPanel({ event, stats, onCheckIn, onBack }: { event?: CreatedEvent, stats?: {sold: number, checked: number}, onCheckIn?: () => void, onBack: () => void }) {
  // Estados principales del escáner
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  
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
    statusClass: string;
    statusText: string;
    time: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(LS_LOGS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logs));
  }, [logs]);

  const errCount = logs.filter(l => l.statusClass === 'ls-err').length;
  const dupCount = logs.filter(l => l.statusClass === 'ls-dup').length;

  // Bucle de inicialización del escáner visual
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    
    if (scanning && (!resultData || !resultData.show)) {
      html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
           if (isMounted) {
             verifyTicket(decodedText);
           }
        },
        () => {}
      ).catch(e => {
         console.warn("No se detectó cámara física o no se dieron permisos: ", e);
      });
    }

    return () => {
      isMounted = false;
      
      // Apagado forzoso de HW (soluciona que la luz de la webcam se quede prendida en Chrome)
      try {
        const vid = document.querySelector('#qr-reader video') as HTMLVideoElement;
        if (vid && vid.srcObject) {
          (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          vid.srcObject = null;
        }
      } catch (e) {}

      if (html5QrCode) {
        try {
          // Intentamos detener siempre pase lo que pase para soltar la cámara
          html5QrCode.stop().then(() => html5QrCode?.clear()).catch(() => {});
        } catch (e) {}
      }
    };
  }, [scanning, resultData?.show]);

  // Tipos de resultados para la simulación (Diccionario de respuestas UI)
  const resultTypes = {
    valid: {
      bg: '#000d0a', iconBg: 'ri-valid', label: 'Entrada válida', sub: 'NFT verificado on-chain',
      svg: <path d="M8 26L14 20L26 10" stroke="#5DCAA5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
      dotClass: 'ld-ok', statusClass: 'ls-ok', statusText: 'Válido'
    },
    invalid: {
      bg: '#1a0000', iconBg: 'ri-invalid', label: 'Entrada inválida', sub: 'NFT no encontrado en la colección',
      svg: <path d="M10 10l12 12M22 10L10 22" stroke="#F09595" strokeWidth="3" strokeLinecap="round" fill="none"/>,
      dotClass: 'ld-err', statusClass: 'ls-err', statusText: 'Inválido'
    },
    duplicate: {
      bg: '#1a0f00', iconBg: 'ri-repeat', label: 'Ya ingresó', sub: 'Este ticket fue escaneado antes',
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
      const addrs = ['7xKf','3mTv','9bWx','1nPq','5rKm','2pQs','8nLx','4kWd'];
      const suffs = ['9pQm','2nLs','4kRd','7cYe','3wBx','6mTr','1vNs','9qPk'];
      const idx = Math.floor(Math.random() * addrs.length);
      addr = addrs[idx] + '…' + suffs[idx];
    }
    
    const now = new Date();
    const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    
    setLogs(prev => [
      { dotClass: r.dotClass, addr, statusClass: r.statusClass, statusText: r.statusText, time },
      ...prev
    ]);
  };

  // Función central para simular el escaneo de un código
  const simulate = (type: keyof typeof resultTypes, mintAddress?: string) => {
    const r = resultTypes[type];

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

  // Solana Wallet & Connection
  const wallet = useWallet();
  const { connection } = useConnection();
  // Eliminado manualMint, ahora 100% lectura por cámara real

  // Interceptar la salida para dar tiempo a la liberación de cámara
  const handleBack = () => {
    setScanning(false);
    setTimeout(onBack, 400); // 400ms para asegurar que Html5Qrcode.stop() procesa el hardware
  };

  const verifyTicket = async (mintToVerify: string) => {
    setScanning(false); // Detener cámara inmediatamente para evitar lecturas dobles
    
    if (!wallet.publicKey) {
      alert("⚠️ El staff debe conectar su wallet superior para firmar los accesos en la blockchain.");
      setTimeout(() => setScanning(true), 1500); // Reactivar cámara poco después
      return;
    }

    // Extraemos el mint si viene dentro de nuestro JSON cryptoPayload
    let targetMint = mintToVerify;
    try {
      const parsed = JSON.parse(mintToVerify);
      if (parsed.mint) targetMint = parsed.mint;
    } catch(e) { }
    
    try {
      // 1. Conexión real enviando la transacción PDA de registro
      const res = await createCheckInPDA(connection, wallet as any, targetMint);
      
      // 2. Mostrar la respuesta UI injectando el ID real detectado
      if (res.status === 'valid') simulate('valid', targetMint);
      else if (res.status === 'invalid') simulate('invalid', targetMint);
      else simulate('duplicate', targetMint);
      
    } catch (e: any) {
      alert("Falló la conexión de lectura con Solana Devnet: " + e.message);
      setScanning(true);
    }
  };

  return (
    <div className="app bg-[#0a0a0f] min-h-screen text-white font-sans">
      <style>{`
        #qr-reader { 
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important; 
          background: transparent !important; 
          z-index: 0 !important;
        }
        #qr-reader * { margin: 0; padding: 0; }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 1 !important;
        }
      `}</style>
      {/* ======= NAVBAR OSCURO PARA STAFF ======= */}
      <PageNav 
        onBack={handleBack} 
        title="Panel de staff" 
        rightElement={<WalletMultiButton className="wallet-chip" style={{ background: '#1a1a2e', color: '#AFA9EC', border: '1px solid #2a2a4a', padding: '4px 10px', fontSize: '11px', height: 'auto', lineHeight: 1 }} />} 
      />

      {/* ======= CONTENEDOR PRINCIPAL ======= */}
      <div className="staff-panel-main">
        
        {/* Chips de contexto del evento */}
        <div className="event-chip">
          <div className="chip-icon" style={{ display: 'flex' }}><Icons.Music size={20} color="#534AB7" /></div>
          <div>
            <div className="chip-name">{event ? event.name : "Noche de Jazz — CDMX"}</div>
            <div className="chip-meta">{event ? `${event.date} · ${event.venue}` : "Hoy · 21:00 h · Foro Indie"}</div>
          </div>
          <div className="chip-right">
            <div className="chip-capacity">{okCount}/{event ? event.aforo : 200}</div>
            <div className="chip-cap-lbl">ingresaron</div>
          </div>
        </div>

        {/* Módulo principal del escáner visual */}
        <div className="scanner-card">
          <div 
            className="scanner-area overflow-hidden" 
            style={{ background: resultData && resultData.show ? resultData.bg : '#000', position: 'relative' }}
          >
            {/* Contenedor nativo del flujo de video */}
            <div id="qr-reader" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: (!resultData?.show && scanning) ? 1 : 0, pointerEvents: 'none', objectFit: 'cover' }}></div>

            {/* Marco de enfoque simulado (diseño custom sobreescrito al stream de video) */}
            <div className="scanner-frame" style={{ opacity: resultData?.show ? 0 : 1, zIndex: 10 }}>
              <div className="corner corner-tl"></div>
              <div className="corner corner-tr"></div>
              <div className="corner corner-bl"></div>
              <div className="corner corner-br"></div>
              {/* Línea láser de escaneo, pausable desde estado */}
              <div className="scan-line" style={{ animationPlayState: scanning ? 'running' : 'paused' }}></div>
            </div>
            
            <div className="scanner-hint" style={{ opacity: resultData?.show ? 0 : 1 }}>
              Apunta la cámara al QR del asistente
            </div>

            {/* Overlay dinámico que se dispara al validar QR */}
            <div className={`result-overlay ${resultData?.show ? 'show' : ''}`}>
               {resultData && (
                <>
                  <div className={`result-icon ${resultData.iconBg}`}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      {resultData.svg}
                    </svg>
                  </div>
                  <div className="result-label" style={{ fontWeight: 500, fontSize: '18px' }}>{resultData.label}</div>
                  <div className="result-sub" style={{ fontSize: '13px', opacity: 0.7 }}>{resultData.sub}</div>
                </>
              )}
            </div>


            
            {/* Animación de escaneo línea láser */}
          </div>

          {/* Estadísticas rápidas bajo el escáner */}
          <div className="stats-strip">
            <div className="strip-stat">
              <div className="strip-val v-green">{okCount}</div>
              <div className="strip-lbl">Válidos</div>
            </div>
            <div className="strip-stat">
              <div className="strip-val v-red">{errCount}</div>
              <div className="strip-lbl">Inválidos</div>
            </div>
            <div className="strip-stat">
              <div className="strip-val v-amber">{dupCount}</div>
              <div className="strip-lbl">Duplicados</div>
            </div>
            <div className="strip-stat">
              <div className="strip-val v-white">{Math.max(0, (event ? event.aforo : 200) - okCount - errCount)}</div>
              <div className="strip-lbl">Pendientes</div>
            </div>
          </div>

          {/* Botones de control (Scan/Flash) */}
          <div className="scanner-controls">
            <button 
              className={`btn-scan ${scanning ? 'btn-scan-on' : 'btn-scan-off'}`} 
              onClick={() => setScanning(!scanning)}
            >
              {scanning ? 'Escáner activo' : 'Escáner pausado'}
            </button>
            <div 
              className={`btn-torch ${torchOn ? 'on' : ''}`} 
              onClick={() => setTorchOn(!torchOn)}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Icons.Flashlight size={18} color="currentColor" />
            </div>
          </div>

          {/* Controles de demostración para el usuario o jurado */}
          <div className="demo-row">
            <span style={{fontSize: '11px', color: '#555', marginRight: '4px'}}>Simular:</span>
            <button className="demo-btn" onClick={() => simulate('valid')}>Válido</button>
            <button className="demo-btn" onClick={() => simulate('invalid')}>Inválido</button>
            <button className="demo-btn" onClick={() => simulate('duplicate')}>Duplicado</button>
          </div>
        </div>

        {/* Registro en tiempo real de los escaneos (Logs) */}
        <div className="log-card">
          <div className="log-header">
            <span className="log-title" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Icons.List size={14} /> Registro de escaneos</span>
            <span className="log-clear" onClick={() => setLogs([])}>Limpiar</span>
          </div>
          <div className="log-list">
            {logs.length === 0 ? (
              <div style={{padding: '16px', textAlign: 'center', fontSize: '12px', color: '#555'}}>Sin registros</div>
            ) : (
              logs.map((log, i) => (
                <div className="log-row" key={i}>
                  <div className={`log-dot ${log.dotClass}`}></div>
                  <div className="log-addr">{log.addr}</div>
                  <div className={`log-status ${log.statusClass}`}>{log.statusText}</div>
                  <div className="log-time">{log.time}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
