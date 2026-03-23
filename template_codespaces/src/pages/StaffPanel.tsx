import { useState } from "react";
import * as Icons from "lucide-react";
import PageNav from "../components/PageNav";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { createCheckInPDA } from "../lib/checkin-pda";
import { CreatedEvent } from "./CreateEvent";
import "../index.css";

export default function StaffPanel({ event, stats, onCheckIn, onBack }: { event?: CreatedEvent, stats?: {sold: number, checked: number}, onCheckIn?: () => void, onBack: () => void }) {
  // Estados principales del escáner
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  
  // Contadores de estadísticas
  const okCount = stats?.checked || 0;
  const [errCount, setErrCount] = useState(0);
  const [dupCount, setDupCount] = useState(0);
  
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

  // Historial de logs
  const [logs, setLogs] = useState<Array<{
    dotClass: string;
    addr: string;
    statusClass: string;
    statusText: string;
    time: string;
  }>>([
    { dotClass: 'ld-ok', addr: '7xKf…9pQm', statusClass: 'ls-ok', statusText: 'Válido', time: '21:47' },
    { dotClass: 'ld-ok', addr: '3mTv…2nLs', statusClass: 'ls-ok', statusText: 'Válido', time: '21:45' },
    { dotClass: 'ld-err', addr: '9bWx…4kRd', statusClass: 'ls-err', statusText: 'Inválido', time: '21:43' },
    { dotClass: 'ld-dup', addr: '1nPq…7cYe', statusClass: 'ls-dup', statusText: 'Duplicado', time: '21:41' },
    { dotClass: 'ld-ok',  addr: '5rKm…3wBx', statusClass: 'ls-ok', statusText: 'Válido', time: '21:39' },
  ]);

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
  const addLog = (rType: keyof typeof resultTypes) => {
    const r = resultTypes[rType];
    const addrs = ['7xKf','3mTv','9bWx','1nPq','5rKm','2pQs','8nLx','4kWd'];
    const suffs = ['9pQm','2nLs','4kRd','7cYe','3wBx','6mTr','1vNs','9qPk'];
    const idx = Math.floor(Math.random() * addrs.length);
    const addr = addrs[idx] + '…' + suffs[idx];
    const now = new Date();
    const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
    
    setLogs(prev => [
      { dotClass: r.dotClass, addr, statusClass: r.statusClass, statusText: r.statusText, time },
      ...prev
    ]);
  };

  // Función central para simular el escaneo de un código
  const simulate = (type: keyof typeof resultTypes) => {
    // if (!scanning) return; // Removed this check as verifyTicket handles scanning state
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

    // Actualizamos estadísticas
    if (type === 'valid') {
       if (onCheckIn) onCheckIn();
    }
    else if (type === 'invalid') setErrCount(c => c + 1);
    else setDupCount(c => c + 1);

    addLog(type);

    // Ocultamos el overlay tras 2.2s volviendo al estado original de cámara
    setTimeout(() => {
      setResultData(prev => prev ? { ...prev, show: false } : null);
    }, 2200);
  };

  // Solana Wallet & Connection
  const wallet = useWallet();
  const { connection } = useConnection();
  const [manualMint, setManualMint] = useState('');

  const verifyTicket = async (mintToVerify: string) => {
    if (!wallet.publicKey) {
      alert("⚠️ El staff debe conectar su wallet superior para firmar los accesos en la blockchain.");
      return;
    }

    // Extraemos el mint si viene dentro de nuestro JSON cryptoPayload
    let targetMint = mintToVerify;
    try {
      const parsed = JSON.parse(mintToVerify);
      if (parsed.mint) targetMint = parsed.mint;
    } catch(e) { }

    setScanning(false);
    
    try {
      // 1. Conexión real enviando la transacción PDA de registro
      const res = await createCheckInPDA(connection, wallet as any, targetMint);
      
      // 2. Mostrar la respuesta UI
      if (res.status === 'valid') simulate('valid');
      else if (res.status === 'invalid') simulate('invalid');
      else simulate('duplicate');
      
    } catch (e: any) {
      alert("Falló la conexión de lectura con Solana Devnet: " + e.message);
      setScanning(true);
    }
  };

  return (
    <div className="app bg-[#0a0a0f] min-h-screen text-white font-sans">
      {/* ======= NAVBAR OSCURO PARA STAFF ======= */}
      <PageNav 
        onBack={onBack} 
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
            className="scanner-area" 
            style={{ background: resultData && resultData.show ? resultData.bg : '#000' }}
          >
            {/* Marco de enfoque simulado (se oculta al mostrar resultado) */}
            <div className="scanner-frame" style={{ opacity: resultData?.show ? 0 : 1 }}>
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

            {/* Input Manual para Demo sin cámara física */}
            {scanning && (
              <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col gap-2 z-20">
                <input 
                  type="text" 
                  placeholder="Pegue aquí el Ticket Mint para probar..." 
                  value={manualMint}
                  onChange={e => setManualMint(e.target.value)}
                  className="w-full bg-black/60 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#534AB7] transition-colors"
                />
                <button 
                  onClick={() => manualMint && verifyTicket(manualMint)}
                  className="w-full bg-[#534AB7] hover:bg-[#433B95] text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-sm"
                >
                  Verificar Manualmente
                </button>
              </div>
            )}
            
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
