'use client';
import { LandingNavBar } from "@/components/layout/LandingNavBar";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { Plus } from "lucide-react";
import "../../../styles/landing.css";
import "../../../styles/layout.css";
import "./Ayuda.css";

export default function AyudaPage() {
  return (
    <div className="lp-container">
      <main className="lp-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <LandingNavBar />
        
        <div className="ayuda-container">
          <div className="ayuda-content">
            
            <div className="ayuda-header">
              <p className="ayuda-title">¿En qué te podemos ayudar?</p>
              <div className="ayuda-search-bar">
                <input 
                  type="text" 
                  placeholder='Busca tu duda: "reventa", "QR no funciona"...' 
                  className="ayuda-search-input"
                />
                <button className="ayuda-search-btn">Buscar</button>
              </div>
            </div>

            <div className="ayuda-section">
              <p className="ayuda-section-title">Explora por tema</p>
              <div className="ayuda-grid">
                <div className="ayuda-card">
                  <p className="ayuda-card-title">Compra de boletos</p>
                  <p className="ayuda-card-desc">Pagos, disponibilidad, zonas</p>
                </div>
                <div className="ayuda-card">
                  <p className="ayuda-card-title">Mi boleto y QR</p>
                  <p className="ayuda-card-desc">Acceso, wallet, validación</p>
                </div>
                <div className="ayuda-card">
                  <p className="ayuda-card-title">Reventa oficial</p>
                  <p className="ayuda-card-desc">Cómo revender, límites</p>
                </div>
                <div className="ayuda-card-special">
                  <p className="ayuda-card-title-special">Para organizadores</p>
                  <p className="ayuda-card-desc-special">Crear evento, cobros, check-in</p>
                </div>
                <div className="ayuda-card">
                  <p className="ayuda-card-title">Pagos y reembolsos</p>
                  <p className="ayuda-card-desc">Tarjeta, OXXO, wallet</p>
                </div>
                <div className="ayuda-card">
                  <p className="ayuda-card-title">Seguridad</p>
                  <p className="ayuda-card-desc">Cómo evitamos el fraude</p>
                </div>
              </div>
            </div>

            <div className="ayuda-section">
              <p className="ayuda-section-title">Preguntas frecuentes</p>
              <div className="ayuda-faq-list">
                <div className="ayuda-faq-item">
                  <span className="ayuda-faq-text">¿Qué pasa si pierdo mi teléfono con el boleto?</span>
                  <Plus size={16} color="#5F5E5A" />
                </div>
                <div className="ayuda-faq-item">
                  <span className="ayuda-faq-text">¿Por qué mi QR cambia cada 30 segundos?</span>
                  <Plus size={16} color="#5F5E5A" />
                </div>
                <div className="ayuda-faq-item">
                  <span className="ayuda-faq-text">¿Cómo revendo mi boleto de forma oficial?</span>
                  <Plus size={16} color="#5F5E5A" />
                </div>
                <div className="ayuda-faq-item">
                  <span className="ayuda-faq-text">¿Necesito una wallet cripto para comprar?</span>
                  <Plus size={16} color="#5F5E5A" />
                </div>
              </div>
            </div>

            <div className="ayuda-contact">
              <div>
                <p className="ayuda-contact-title">¿No encontraste tu respuesta?</p>
                <p className="ayuda-contact-desc">Nuestro equipo responde en menos de 24 horas</p>
              </div>
              <button className="ayuda-contact-btn">
                Contactar soporte
              </button>
            </div>
            
          </div>
        </div>

        <LandingFooter />
      </main>
    </div>
  );
}
