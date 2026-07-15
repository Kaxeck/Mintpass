'use client';
import { useState } from "react";
import * as Icons from "lucide-react";
import { CreatedEvent } from "./CreateEvent";
import '../../styles/CheckInStaff.css';

export default function CheckInStaff({ events, onGoToScanner }: { events: CreatedEvent[], onGoToScanner: (token: string) => void }) {
  const [view, setView] = useState<'list' | 'manage'>('list');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [links, setLinks] = useState<{ id: string, name: string, token: string, createdAt: number, status: 'active' | 'revoked', eventId: number }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generateLink = () => {
    if (!selectedEventId) return;
    const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newLink = {
      id: Date.now().toString(),
      name: `Guardia ${links.filter(l => l.eventId === selectedEventId).length + 1}`,
      token: newToken,
      createdAt: Date.now(),
      status: 'active' as const,
      eventId: selectedEventId
    };
    setLinks([newLink, ...links]);
  };

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/staff-scanner/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const revokeLink = (id: string) => {
    setLinks(links.map(l => l.id === id ? { ...l, status: 'revoked' } : l));
  };

  const currentEventLinks = links.filter(l => l.eventId === selectedEventId);

  return (
    <div className="checkin-staff">

      {view === 'list' ? (
        <>
          <div className="checkin-header">
            <p className="title">Check-in y staff</p>
            <p className="subtitle">
              Elige un evento para generar accesos de puerta para tu equipo.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              <Icons.CalendarPlus size={36} color="var(--border)" style={{ marginBottom: '14px' }} />
              <p className="title">Todavía no tienes eventos</p>
              <p className="subtitle">Crea tu primer evento para poder generar accesos de check-in.</p>
            </div>
          ) : (
            <div className="event-grid">
              {events.map(ev => {
                const activeCount = links.filter(l => l.eventId === ev.id && l.status === 'active').length;
                
                const categoryIcons: Record<string, string> = {
                  'Música / Concierto': 'Music', 'Arte y cultura': 'Palette', 'Deporte': 'Activity',
                  'Feria y mercado': 'ShoppingBag', 'Teatro y danza': 'Drama', 'Otro': 'Sparkles'
                };
                const bgColors: Record<string, string> = {
                  'Música / Concierto': 'rgba(83,74,183,0.15)', 'Arte y cultura': 'rgba(75,170,70,0.15)', 'Deporte': 'rgba(216,90,48,0.15)',
                  'Feria y mercado': 'rgba(83,74,183,0.15)', 'Teatro y danza': 'rgba(75,170,70,0.15)', 'Otro': 'rgba(216,90,48,0.15)'
                };
                const textColors: Record<string, string> = {
                  'Música / Concierto': '#534AB7', 'Arte y cultura': '#4BAA46', 'Deporte': '#D85A30',
                  'Feria y mercado': '#534AB7', 'Teatro y danza': '#4BAA46', 'Otro': '#D85A30'
                };

                const EventIcon = (Icons as Record<string, unknown>)[categoryIcons[ev.category] || 'Sparkles'] as typeof Icons.HelpCircle || Icons.HelpCircle;
                const coverBg = bgColors[ev.category] || 'rgba(83,74,183,0.15)';
                const coverColor = textColors[ev.category] || '#534AB7';

                return (
                  <button
                    key={ev.id}
                    onClick={() => { setSelectedEventId(ev.id); setView('manage'); }}
                    className="event-card"
                  >
                    <div className="event-card-cover" style={ev.coverImage ? { backgroundImage: `url('${ev.coverImage}')` } : { backgroundColor: coverBg, color: coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!ev.coverImage && <EventIcon size={36} />}
                    </div>
                    <div className="event-card-body">
                      <p className="event-card-title">{ev.name}</p>
                      <p className="event-card-meta">{ev.date} · {ev.venue}</p>
                      <div className="event-card-footer">
                        <span className={`event-card-badge ${activeCount > 0 ? 'active' : 'inactive'}`}>
                          {activeCount} {activeCount === 1 ? 'acceso activo' : 'accesos activos'}
                        </span>
                        <Icons.ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => setView('list')}
            className="btn-back"
          >
            <Icons.ArrowLeft size={14} /> Volver a eventos
          </button>
          
          <div className="manage-header">
            <p className="title">Accesos de check-in</p>
            <p className="subtitle">
              {events.find(e => e.id === selectedEventId)?.name}
            </p>
          </div>

          <div className="manage-grid">
            {/* Panel izquierdo: lista de enlaces */}
            <div>
              <div className="links-header">
                <p>Enlaces mágicos</p>
                <button onClick={generateLink} className="btn-create-link">
                  <Icons.Link size={15} /> Crear enlace
                </button>
              </div>

              <div className="links-container">
                {currentEventLinks.length === 0 ? (
                  <div className="links-empty">
                    <Icons.QrCode size={36} color="var(--border)" style={{ marginBottom: '14px' }} />
                    <p className="title">Ningún acceso generado</p>
                    <p className="subtitle">
                      Crea un enlace y compártelo con tu staff para que empiecen a escanear boletos.
                    </p>
                  </div>
                ) : (
                  <div>
                    {currentEventLinks.map((link) => (
                      <div key={link.id} className="link-row">
                        <div className={`link-info ${link.status === 'revoked' ? 'revoked' : ''}`}>
                          <p className="link-info-name">{link.name}</p>
                          <p className="link-info-meta">
                            <span className="link-info-token">{link.token}</span>
                            {' '}· hace {Math.floor((Date.now() - link.createdAt) / 60000)} min
                          </p>
                        </div>

                        <div className="link-actions">
                          {link.status === 'active' ? (
                            <>
                              <span className="status-badge active">Activo</span>
                              <button onClick={() => onGoToScanner(link.token)} className="btn-test">Probar</button>
                              <button onClick={() => handleCopy(link.token)} className="btn-copy">
                                {copied === link.token ? 'Copiado ✓' : 'Copiar URL'}
                              </button>
                              <button onClick={() => revokeLink(link.id)} className="btn-revoke" title="Revocar acceso">
                                <Icons.Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="status-badge revoked">Revocado</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho: info técnica + advertencia + instalación */}
            <div className="info-panel">
              <div className="info-box-purple">
                <div className="title-wrap">
                  <Icons.ShieldCheck size={20} color="var(--purple-text)" />
                  <p className="title">Seguridad sin gas</p>
                </div>
                <p className="desc">
                  El escáner usa infraestructura Relayer: tu staff no necesita wallet propia ni pagar comisión de red en Solana.
                </p>
              </div>

              <div className="info-box-warning">
                <Icons.TriangleAlert size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p className="desc">
                  Cualquier persona con este enlace puede marcar boletos como usados. Compártelo solo con dispositivos de confianza.
                </p>
              </div>

              <div className="info-box-white">
                <p className="title">
                  <Icons.Smartphone size={17} color="var(--carbon)" /> Instalar en el teléfono
                </p>

                <div className="step-row mb">
                  <div className="step-number">1</div>
                  <p className="step-desc">Abre el enlace en Safari (iOS) o Chrome (Android).</p>
                </div>

                <div className="step-row">
                  <div className="step-number">2</div>
                  <p className="step-desc">
                    Menú del navegador → <span className="bold">Agregar a inicio</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}