'use client';
import { useState } from 'react';
import * as Icons from "lucide-react";
import { organizerProfileSchema } from "../../lib/validations";
import { z } from "zod";

export interface OrganizerProfile {
  name: string;
  category: string;
  bio: string;
  supportEmail: string;
  internalPhone: string;
  logoUrl?: string;
  socialLink?: string;
}

interface Props {
  onComplete: (profile: OrganizerProfile) => void;
}

export default function OrganizerProfileSetup({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [internalPhone, setInternalPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [socialLink, setSocialLink] = useState('');

  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    const formData = {
      name,
      category,
      bio,
      supportEmail,
      internalPhone,
      logoUrl: logoUrl || undefined,
      socialLink: socialLink || undefined
    };

    const result = organizerProfileSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        formattedErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    onComplete(result.data);
  };

  return (
    <div style={{ flex: 1, padding: '40px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #D3D1C7', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: '#EAF3DE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icons.Building2 size={24} color="#4BAA46" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: '#1E1E1E' }}>Crea tu Perfil de Organizador</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#5F5E5A', lineHeight: '1.5' }}>
            Estás a un paso de crear tu primer evento. Configura tu perfil público para generar confianza en tus asistentes y empezar a construir tu reputación.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Public Info */}
          <div style={{ background: '#F7F8F7', borderRadius: '12px', padding: '20px', border: '1px solid #E5E5E5' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Eye size={16} color="#5F5E5A" /> Información Pública
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: (showErrors && errors.name) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Nombre de Productora / Organizador *</label>
                <input type="text" placeholder="Ej. Indie Rocks!" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.name) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                {showErrors && errors.name && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.name}</p>}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: (showErrors && errors.category) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Categoría *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.category) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: category ? '#1E1E1E' : '#8A8880' }}>
                  <option value="">Selecciona una categoría</option>
                  <option value="Productora / Promotor">Productora / Promotor</option>
                  <option value="Foro / Venue">Foro / Venue</option>
                  <option value="Artista Independiente">Artista Independiente</option>
                  <option value="Universidad / Escuela">Universidad / Escuela</option>
                  <option value="Comunidad / Colectivo">Comunidad / Colectivo</option>
                  <option value="Otro">Otro</option>
                </select>
                {showErrors && errors.category && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.category}</p>}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: (showErrors && errors.bio) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Biografía / Descripción *</label>
                <textarea placeholder="Cuéntanos sobre ti y el tipo de eventos que organizas..." value={bio} onChange={e => setBio(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.bio) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E', minHeight: '80px', resize: 'vertical' }} />
                {showErrors && errors.bio && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.bio}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: (showErrors && errors.logoUrl) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Logo URL (Opcional)</label>
                  <input type="text" placeholder="https://..." value={logoUrl} onChange={e => setLogoUrl(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.logoUrl) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                  {showErrors && errors.logoUrl && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.logoUrl}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: (showErrors && errors.socialLink) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Red Social (Opcional)</label>
                  <input type="text" placeholder="https://..." value={socialLink} onChange={e => setSocialLink(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.socialLink) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                  {showErrors && errors.socialLink && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.socialLink}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Private Info */}
          <div style={{ background: '#F0F4F8', borderRadius: '12px', padding: '20px', border: '1px solid #D8E2EC' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.ShieldAlert size={16} color="#3C3489" /> Privado y Soporte
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: (showErrors && errors.supportEmail) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Correo para dudas del evento *</label>
                <input type="email" placeholder="hola@miproductora.com" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.supportEmail) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                {showErrors && errors.supportEmail ? <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.supportEmail}</p> : <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8A8880' }}>Tus asistentes podrán contactarte aquí en caso de dudas sobre su boleto.</p>}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: (showErrors && errors.internalPhone) ? '#B0523E' : '#5F5E5A', display: 'block', marginBottom: '6px' }}>Teléfono de contacto (Interno) *</label>
                <input type="tel" placeholder="+52 ..." maxLength={15} value={internalPhone} onChange={e => {
                  const val = e.target.value.replace(/[^\d+ ]/g, '');
                  setInternalPhone(val);
                }} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: (showErrors && errors.internalPhone) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                {showErrors && errors.internalPhone ? <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#B0523E' }}>{errors.internalPhone}</p> : <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8A8880' }}>Se guarda solo en base de datos. Lo usaremos para contactarte por pagos o alertas.</p>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" style={{ background: '#1E1E1E', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s' }}>
              Guardar y Continuar <Icons.ArrowRight size={16} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
