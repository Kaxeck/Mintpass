import { useState } from 'react';
import * as Icons from "lucide-react";
import PageNav from "../components/PageNav";
import { useUmi } from "../providers";
import { createEventCollection } from "../lib/metaplex";
import { saveEventOnChain } from "../lib/event-pda";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

// Interfaz compartida para los eventos creados on-chain
export interface CreatedEvent {
  id: number;
  collectionMint: string;
  name: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  aforo: number;
  priceType: 'free' | 'sol' | 'usdc';
  price: number;
  createdAt: number; // timestamp
}

export default function CreateEvent({ onBack, onSuccess }: { onBack: () => void, onSuccess: (event: CreatedEvent) => void }) {
  const umi = useUmi();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('');
  const [aforo, setAforo] = useState('');
  const [priceType, setPriceType] = useState<'free' | 'sol' | 'usdc'>('free');
  const [price, setPrice] = useState('');
  const [limit, setLimit] = useState('');

  const [tglNfc, setTglNfc] = useState(false);
  const [tglWallet, setTglWallet] = useState(true);
  const [tglPoap, setTglPoap] = useState(true);

  // Estado para controlar la animación del botón de Crear
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);

  // Validar si el formulario mínimo está lleno
  const isFilled = name && date && venue && aforo;

  // Lógica para comunicarse on-chain con el programa de Solana
  const handleCreate = async () => {
    if (!wallet.publicKey) {
      alert("⚠️ Conecta tu wallet en la barra lateral primero para lanzar el contrato del evento.");
      return;
    }

    setIsCreating(true);
    setCreationStep(1);

    try {
      // Creamos la colección NFT on-chain
      const collectionAddr = await createEventCollection(umi, {
        name: name || "Evento Mintpass",
        description: desc || "Un evento seguro con tickets NFT dinámicos.",
        imageUrl: "https://lime-accessible-woodpecker-99.mypinata.cloud/ipfs/bafkreif4xoh5gdt3j3p7hsvqmbmbgckmczxmtxy23tzjlyt3y4c4m3hsqa", // Imagen Dummy
        organizerWallet: wallet.publicKey.toBase58()
      });

      setCreationStep(2);

      // Después de crear la colección NFT, guardamos los metadatos
      // del evento en una PDA on-chain (~0.003 SOL de rent-exempt deposit).
      // Esto permite que los datos persistan en la blockchain y se lean desde cualquier cliente.
      const eventDataOnChain = {
        name: name || "Evento Mintpass",
        description: desc || "Un evento seguro con tickets NFT dinámicos.",
        date: date,
        time: time,
        venue: venue,
        category: category,
        aforo: parseInt(aforo) || 0,
        priceType: priceType as 'free' | 'sol' | 'usdc',
        price: priceType === 'free' ? 0 : parseFloat(price) || 0,
        collectionMint: collectionAddr,
        createdAt: Date.now()
      };

      try {
        // Segunda transacción - guardar metadata en PDA on-chain
        await saveEventOnChain(connection, wallet, eventDataOnChain);
        console.log("Evento guardado exitosamente on-chain.");
      } catch (pdaError: any) {
        // Si falla el guardado en PDA, no bloqueamos el flujo
        // ya que la colección NFT ya fue creada exitosamente.
        console.warn("Advertencia: No se pudo guardar metadata en PDA on-chain:", pdaError.message);
      }

      setTimeout(() => {
        // Regresamos el evento completo con todos sus datos al App.tsx
        onSuccess({
          id: Date.now(),
          ...eventDataOnChain
        });
      }, 900);
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || String(e);
      if (errorMsg.toLowerCase().includes("blockhash") || errorMsg.toLowerCase().includes("fund")) {
        alert("⚠️ Error de transacción: Es muy probable que no tengas suficientes fondos (SOL de prueba) en tu wallet para pagar la cuota de la red. Por favor, solicita SOL en el Faucet de Devnet e intenta de nuevo.");
      } else {
        alert("Error ejecutando la transacción en devnet:\n" + errorMsg);
      }
      setIsCreating(false);
      setCreationStep(0);
    }
  };

  // Preparar datos para la Preview de la tarjeta lateral
  let metaParts = [];
  if (date) {
    const d = new Date(date + 'T12:00');
    metaParts.push(d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  }
  if (time) metaParts.push(`${time} h`);
  if (venue) metaParts.push(venue);
  
  const displayMeta = metaParts.length > 0 ? metaParts.join(' · ') : 'Fecha · Hora · Lugar';
  const displayPrice = priceType === 'free' ? 'Gratis' : (price ? `${price} ${priceType.toUpperCase()}` : `— ${priceType.toUpperCase()}`);

  return (
    <div className="app">
      {/* ======= NAVBAR SECUNDARIO ======= */}
      <PageNav 
        onBack={onBack} 
        title="Crear evento" 
        icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" fill="#fff"/><rect x="9" y="2" width="5" height="5" rx="1.5" fill="#fff" opacity=".6"/><rect x="2" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".6"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="#fff" opacity=".3"/></svg>} 
      />

      {/* ======= CONTENEDOR PRINCIPAL ======= */}
      <div className="main create-event-main">
        
        {/* Lado izquierdo: Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-card">
            
            <div className="form-section">
              <div className="section-label">Información del evento</div>
              <div className="field">
                <label>Nombre del evento *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Noche de Jazz — Roma Norte" 
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="char-count"><span>{name.length}</span> / 60</div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <textarea 
                  placeholder="Cuéntale a tu público de qué se trata..." 
                  maxLength={200}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
                <div className="char-count"><span>{desc.length}</span> / 200</div>
              </div>
              <div className="field">
                <label>Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Selecciona una categoría</option>
                  <option>Música / Concierto</option>
                  <option>Arte y cultura</option>
                  <option>Deporte</option>
                  <option>Feria y mercado</option>
                  <option>Teatro y danza</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Fecha, hora y lugar</div>
              <div className="field-row">
                <div className="field">
                  <label>Fecha *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Hora *</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Lugar / Venue *</label>
                <input type="text" placeholder="Ej. Foro Indie, Roma Norte, CDMX" value={venue} onChange={e => setVenue(e.target.value)} />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Tickets y precio</div>
              <div className="field">
                <label>Aforo total *</label>
                <input type="number" placeholder="Ej. 200" min="1" value={aforo} onChange={e => setAforo(e.target.value)} />
                <div className="hint">Define cuántos NFT-tickets se van a mintear.</div>
              </div>
              <div className="field">
                <label>Precio</label>
                <div className="price-toggle">
                  <div className={`ptab ${priceType === 'free' ? 'on' : ''}`} onClick={() => setPriceType('free')}>Gratis</div>
                  <div className={`ptab ${priceType === 'sol' ? 'on' : ''}`} onClick={() => setPriceType('sol')}>SOL</div>
                  <div className={`ptab ${priceType === 'usdc' ? 'on' : ''}`} onClick={() => setPriceType('usdc')}>USDC</div>
                </div>
                {priceType !== 'free' && (
                  <div id="price-input" style={{ marginTop: '8px' }}>
                    <input type="number" placeholder={priceType === 'sol' ? "0.05" : "15"} step="0.001" min="0" value={price} onChange={e => setPrice(e.target.value)} />
                    <div className="hint">
                      {priceType === 'sol' ? 'El asistente paga en SOL. Sin comisiones de plataforma.' : 'El asistente paga en USDC. Ideal para precios fijos.'}
                    </div>
                  </div>
                )}
              </div>
              <div className="field">
                <label>Límite por wallet</label>
                <input type="number" placeholder="Ej. 2 (deja vacío para sin límite)" min="1" value={limit} onChange={e => setLimit(e.target.value)} />
                <div className="hint">Evita que una sola wallet acapare entradas.</div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Opciones avanzadas</div>
              <div className="field">
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Activar check-in IoT</div>
                    <div className="toggle-sub">Habilita verificación por pulsera NFC</div>
                  </div>
                  <div className={`toggle ${tglNfc ? 'on' : ''}`} onClick={() => setTglNfc(!tglNfc)}><div className="toggle-thumb"></div></div>
                </div>
              </div>
              <div className="field" style={{ marginTop: '10px' }}>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Wallet de consumo intra-evento</div>
                    <div className="toggle-sub">Permite pagos en barras y merch</div>
                  </div>
                  <div className={`toggle ${tglWallet ? 'on' : ''}`} onClick={() => setTglWallet(!tglWallet)}><div className="toggle-thumb"></div></div>
                </div>
              </div>
              <div className="field" style={{ marginTop: '10px' }}>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Generar POAP al terminar</div>
                    <div className="toggle-sub">Muta el ticket a coleccionable</div>
                  </div>
                  <div className={`toggle ${tglPoap ? 'on' : ''}`} onClick={() => setTglPoap(!tglPoap)}><div className="toggle-thumb"></div></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Lado derecho: Sidebar y Vista Previa */}
        <div className="sidebar">
          
          <div className="preview-card">
            <div className="step-indicator">
              <div className="step">
                <div className={`step-dot ${creationStep > 0 ? 'done' : 'active'}`}>1</div>
              </div>
              <div className="step-sep"></div>
              <div className="step">
                <div className={`step-dot ${creationStep > 1 ? 'done' : (creationStep === 1 ? 'active' : 'todo')}`}>2</div>
              </div>
              <div className="step-sep"></div>
              <div className="step">
                <div className={`step-dot ${creationStep > 2 ? 'done' : (creationStep === 2 ? 'active' : 'todo')}`}>3</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: '4px' }}>Formulario → NFT → Blink</div>
            </div>
            
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)' }}></div>
            
            <div className="preview-cover" style={aforo ? { background: 'rgba(83,74,183,0.15)' } : {}}>
              {aforo ? (
                <span style={{ fontSize: '11px', color: '#AFA9EC' }}>{aforo} entradas</span>
              ) : (
                <span className="preview-cover-text">Vista previa del Blink</span>
              )}
            </div>
            
            <div className="preview-body">
              <div className="preview-name" style={{ color: name ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
                {name || 'Nombre del evento'}
              </div>
              <div className="preview-meta" style={{ color: metaParts.length ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                {displayMeta}
              </div>
            </div>
            <div className="preview-footer">
              <div className="preview-price">{displayPrice}</div>
            </div>
          </div>

          <div className="info-box" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Icons.Info size={20} color="#AFA9EC" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Al crear tu evento:</strong>
              <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Se lanza la colección NFT en la blockchain.</li>
                <li>Obtienes un <b>Blink URL</b> listo para vender en Twitter/X.</li>
                <li>Tus usuarios mintean su ticket automáticamente al pagar.</li>
              </ul>
            </div>
          </div>

          <div className="submit-area">
            <button 
              className="btn-full" 
              onClick={handleCreate} 
              disabled={!isFilled || isCreating}
              style={{ background: creationStep > 0 ? '#1D9E75' : '' }}
            >
              {creationStep === 0 ? 'Crear evento y generar Blink' : (creationStep === 1 ? 'Creando colección NFT...' : 'Evento creado — generando Blink...')}
            </button>
            <button className="btn-outline" onClick={onBack}>Cancelar</button>
            <div className="hint" style={{ marginTop: '12px', textAlign: 'center', lineHeight: '1.4' }}>
              * Al crear el evento pagarás una pequeña tarifa de red (gas) en SOL para alojar los datos de manera permanente en la blockchain.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
