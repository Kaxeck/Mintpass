'use client';
import { useState, Fragment, useMemo, useEffect } from 'react';
import { Country, State, City } from 'country-state-city';
import * as Icons from "lucide-react";
import PageNav from "../../components/layout/PageNav";
import { useUmi } from "../../components/providers";
import { createEventCollectionBuilder } from "../../lib/metaplex";
import { buildSaveEventInstruction } from "../../lib/event-pda";
import { transactionBuilder } from "@metaplex-foundation/umi";
import { useActiveSolanaWallet } from "../../hooks/useActiveSolanaWallet";
import { type Address, address as getAddress } from "@solana/kit";
import AlertModal, { AlertModalProps } from "../../components/ui/AlertModal";
import { createEventInDb } from "../../app/actions/events";
import { eventSchema } from "../../lib/validations";

export interface CreatedEvent {
  id: string | number;
  address?: string;
  collectionMint: string;
  name: string;
  organizerName?: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  category: string;
  cat?: string;
  city?: string;
  state?: string;
  country?: string;
  coverImage?: string;
  lineup?: string[];
  zones: { id?: string; name: string; capacity: number; price: number; position?: string; gate?: string; isNumbered?: boolean }[];
  allowResale: boolean;
  resaleCapLimit?: number;
  isSoulbound: boolean;
  allowRefunds?: boolean;
  refundTimeLimit?: number;
  identityLimit?: number;
  organizerWallet?: string;
  createdAt: number;
  ageRestriction?: string;
  doorTime?: string;
  status?: string;
  escrowVault?: string;
  // Para compatibilidad hacia atrás temporal con vistas de listado
  aforo?: number;
  priceType?: string;
  price?: number;
  hasMultipleZones?: boolean;
}

export default function CreateEvent({ onBack, onSuccess }: { onBack: () => void, onSuccess: (event: CreatedEvent) => void }) {
  const umi = useUmi();
  const { walletAddress: walletAddressStr, user, login, getAccessToken } = useActiveSolanaWallet();

  let walletAddress: Address | null = null;
  if (walletAddressStr) {
    try {
      walletAddress = getAddress(walletAddressStr);
    } catch (e) {
      console.warn("Invalid Solana address:", walletAddressStr);
    }
  }

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [ticketImage, setTicketImage] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [lineup, setLineup] = useState(''); // Comma separated

  const [zones, setZones] = useState<{ id: string; name: string; capacity: number; price: number; position?: string; gate?: string; isNumbered?: boolean }[]>([
    { id: '1', name: 'General', capacity: 100, price: 0.05, position: 'general', isNumbered: false }
  ]);

  const [allowResale, setAllowResale] = useState(false);
  const [resaleCapLimit, setResaleCapLimit] = useState('');
  const [isSoulbound, setIsSoulbound] = useState(true); // Nominativas (intransferibles) por defecto
  const [allowRefunds, setAllowRefunds] = useState(false);
  const [refundTimeLimit, setRefundTimeLimit] = useState('');
  const [identityLimit, setIdentityLimit] = useState('');

  const [ageRestriction, setAgeRestriction] = useState('');
  const [doorTime, setDoorTime] = useState('');

  const [countryIso, setCountryIso] = useState('MX');
  const [stateIso, setStateIso] = useState('');
  const [cityName, setCityName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD'>('MXN');
  
  const availableCountries = useMemo(() => Country.getAllCountries(), []);
  const availableStates = useMemo(() => State.getStatesOfCountry(countryIso), [countryIso]);
  const availableCities = useMemo(() => {
    return City.getCitiesOfState(countryIso, stateIso).filter(c => 
      !c.name.includes('(') && 
      !c.name.includes('[') && 
      !c.name.includes('Ejido') && 
      !c.name.includes('Colonia') && 
      !c.name.includes('Fraccionamiento') &&
      !c.name.includes('Hacienda')
    );
  }, [countryIso, stateIso]);
  
  const [showErrors, setShowErrors] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Info, 2: Zones, 3: Rules, 4: Review
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [alertConfig, setAlertConfig] = useState<AlertModalProps>({ 
    isOpen: false, title: '', message: '', type: 'info', 
    onClose: () => setAlertConfig(p => ({...p, isOpen: false})) 
  });

  const [createdEventData, setCreatedEventData] = useState<CreatedEvent | null>(null);
  const [dynamicSolFee, setDynamicSolFee] = useState<string>('0.01965');
  const [walletBalanceSol, setWalletBalanceSol] = useState<string | null>(null);

  // Consulta dinámica en tiempo real del costo exacto de almacenamiento on-chain (Rent-Exemption) y saldo de la wallet
  useEffect(() => {
    async function fetchDynamicRentAndBalance() {
      if (!umi) return;
      try {
        // Cuentas creadas para la Colección NFT de Metaplex:
        // 1) Mint (82b)
        // 2) Associated Token Account (165b)
        // 3) Master Edition V2 (468b)
        // 4) Metadata Account con Collection Details (~1596b)
        // 5) EventRecord PDA (~1048b)
        const [mintRent, ataRent, meRent, metaRent, pdaRent] = await Promise.all([
          umi.rpc.getRent(82),
          umi.rpc.getRent(165),
          umi.rpc.getRent(468),
          umi.rpc.getRent(1596),
          umi.rpc.getRent(1048)
        ]);

        const totalLamports = Number(mintRent.basisPoints) + Number(ataRent.basisPoints) + Number(meRent.basisPoints) + Number(metaRent.basisPoints) + Number(pdaRent.basisPoints);
        const totalSol = (totalLamports / 1_000_000_000).toFixed(5);
        setDynamicSolFee(totalSol);

        if (walletAddress) {
          try {
            const { publicKey } = await import("@metaplex-foundation/umi");
            const balance = await umi.rpc.getBalance(publicKey(walletAddress));
            const balSol = (Number(balance.basisPoints) / 1_000_000_000).toFixed(3);
            setWalletBalanceSol(balSol);
          } catch (balErr) {
            console.warn("No se pudo consultar el saldo de la wallet:", balErr);
          }
        }
      } catch (e) {
        console.warn("No se pudo obtener la renta dinámica de Solana, usando aproximación:", e);
      }
    }
    fetchDynamicRentAndBalance();
  }, [umi, walletAddress, wizardStep]);

  const showAlert = (title: string, message: string, type: AlertModalProps['type']) => {
    setAlertConfig(prev => ({ ...prev, isOpen: true, title, message, type }));
  };

  const isFilled = name && date && venue && zones.length > 0;
  const moveZone = (idx: number, dir: number) => {
    const newZones = [...zones];
    const temp = newZones[idx];
    newZones[idx] = newZones[idx + dir];
    newZones[idx + dir] = temp;
    setZones(newZones);
  };

  const validateStepData = (stepToValidate: number): boolean => {
    const data = {
      name, description: desc || undefined, category, date, time, venue, 
      city: cityName, state: stateIso, country: countryIso, 
      coverImage: coverImage || undefined, ticketImage: ticketImage || undefined, 
      lineup: lineup ? lineup.split(',').map(s=>s.trim()) : undefined, 
      zones, allowResale, 
      resaleCapLimit: resaleCapLimit ? parseInt(resaleCapLimit) : undefined, 
      isSoulbound, allowRefunds, 
      refundTimeLimit: refundTimeLimit ? parseInt(refundTimeLimit) : undefined, 
      identityLimit: identityLimit ? parseInt(identityLimit) : undefined, 
      ageRestriction, doorTime: doorTime || undefined, 
      collectionMint: "dummy", organizerWallet: "dummy"
    };

    const result = eventSchema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    result.error.issues.forEach(iss => {
      newErrors[iss.path[0] as string] = iss.message;
    });
    setErrors(newErrors);

    const step1Fields = ['name', 'description', 'category', 'date', 'time', 'doorTime', 'venue', 'city', 'state', 'country', 'ageRestriction', 'coverImage', 'ticketImage'];
    const step2Fields = ['zones'];
    const step3Fields = ['resaleCapLimit', 'identityLimit'];

    if (stepToValidate >= 1 && step1Fields.some(f => newErrors[f])) return false;
    if (stepToValidate >= 2 && step2Fields.some(f => newErrors[f])) return false;
    if (stepToValidate >= 3 && step3Fields.some(f => newErrors[f])) return false;

    return true;
  };

  const handleCreate = async () => {
    if (!validateStepData(3)) {
      setShowErrors(true);
      showAlert("Campos Incompletos", "Por favor completa todos los campos obligatorios antes de publicar el evento.", "warning");
      return;
    }
    
    if (!walletAddress) {
      showAlert("Wallet Desconectada", "Abre la ventana de conexión para vincular tu wallet y lanzar el contrato del evento en la blockchain de Solana.", "warning");
      login();
      return;
    }

    try {
      const { Connection, PublicKey } = await import('@solana/web3.js');
      const connection = new Connection("https://api.devnet.solana.com");
      const balance = await connection.getBalance(new PublicKey(walletAddress));
      if (balance === 0) {
        showAlert("Saldo Insuficiente en Devnet", `La wallet conectada (${walletAddress}) tiene 0 SOL en la red Devnet.\n\nPor favor, usa un Faucet para enviar fondos a esta dirección exacta antes de continuar.`, "warning");
        return;
      }
    } catch (e) {
      console.warn("No se pudo verificar el saldo previamente:", e);
    }

    setIsCreating(true);

    try {
      // 1. Preparar el builder de la Colección NFT on-chain via UMI
      const { builder: collectionBuilder, collectionMint: collectionAddr } = await createEventCollectionBuilder(umi, {
        name: name || "Evento Mintpass",
        description: desc || "Un evento seguro con tickets NFT dinámicos.",
        imageUrl: coverImage || ticketImage || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop",
        organizerWallet: walletAddress
      });

      const eventDataOnChain = {
        name,
        description: "", // Evitamos enviar descripciones largas a la blockchain para ahorrar recursos
        category,
        date,
        time,
        venue,
        city: cityName,
        state: stateIso,
        country: countryIso,
        coverImage: coverImage || undefined,
        ticketImage: ticketImage || coverImage || undefined,
        lineup: lineup ? lineup.split(',').map(s => s.trim()) : undefined,
        zones: zones,
        allowResale,
        resaleCapLimit: resaleCapLimit ? parseInt(resaleCapLimit) : undefined,
        isSoulbound,
        allowRefunds,
        refundTimeLimit: refundTimeLimit ? parseInt(refundTimeLimit) : undefined,
        identityLimit: identityLimit ? parseInt(identityLimit) : undefined,
        ageRestriction,
        doorTime,
        collectionMint: collectionAddr,
        createdAt: Date.now()
      };

      let eventRecordPdaStr = "";
      let escrowVaultStr = "";
      try {
        // 2. Construir la instrucción de Anchor para registrar el evento
        const { instruction, pda } = await buildSaveEventInstruction(walletAddress, eventDataOnChain);
        eventRecordPdaStr = pda.toString();
        console.log("PDA para guardar evento:", pda);

        const { EVENT_REGISTRY_PROGRAM_ID } = await import("../../lib/anchor");
        const { getProgramDerivedAddress, getAddressEncoder } = await import("@solana/addresses");
        const encoder = getAddressEncoder();
        const [escrowState] = await getProgramDerivedAddress({
          programAddress: EVENT_REGISTRY_PROGRAM_ID,
          seeds: [Buffer.from("escrow_state"), encoder.encode(pda)]
        });
        const [escrowVault] = await getProgramDerivedAddress({
          programAddress: EVENT_REGISTRY_PROGRAM_ID,
          seeds: [Buffer.from("escrow_vault"), encoder.encode(escrowState)]
        });
        escrowVaultStr = escrowVault.toString();
        
        // 3. Unir la creación de la colección y el registro del evento en UNA SOLA TRANSACCIÓN ATÓMICA
        const fullTxBuilder = collectionBuilder.add({
          instruction: instruction,
          signers: [umi.identity],
          bytesCreatedOnChain: 0
        });

        await fullTxBuilder.sendAndConfirm(umi);
        console.log("Colección y Evento creados exitosamente en una sola transacción on-chain.");
      } catch (pdaError: unknown) {
        const msg = pdaError instanceof Error ? pdaError.message : String(pdaError);
        console.error("Error crítico: No se pudo guardar metadata en PDA on-chain:", msg);
        showAlert("Error de Transacción", "No se pudo registrar el evento en la blockchain. Asegúrate de aprobar la transacción y tener suficiente SOL.", "error");
        setIsCreating(false);
        return;
      }

      // Guardar evento en la Base de Datos (Supabase via Prisma)
      try {
        const token = await getAccessToken() || undefined;
        const dbResult = await createEventInDb({
          organizerWallet: walletAddress,
          organizerEmail: user?.email?.address,
          eventRecordPda: eventRecordPdaStr,
          escrowVault: escrowVaultStr,
          ...eventDataOnChain,
          description: desc, // Se guarda la descripción real solo en la BD off-chain
          gallery: gallery.filter(url => url.trim() !== '') // Solo guardamos URLs válidas en BD
        }, token);
        if (!dbResult.success) {
          console.warn("Advertencia: No se pudo guardar el evento en la BD Web2", dbResult.error);
        } else {
          console.log("Evento guardado exitosamente en Supabase (DB).");
        }
      } catch (dbError) {
        console.warn("Error inesperado guardando en BD:", dbError);
      }

      // Simulamos un pequeño delay de red antes de mostrar el éxito
      setTimeout(() => {
        setIsCreating(false);
        setCreatedEventData({
          id: Date.now(),
          organizerWallet: walletAddress,
          address: eventRecordPdaStr,
          escrowVault: escrowVaultStr,
          ...eventDataOnChain
        });
      }, 500);
    } catch (e: unknown) {
      console.error("Error al publicar evento:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      const lowerMsg = errorMsg.toLowerCase();

      if (
        lowerMsg.includes("debit") || 
        lowerMsg.includes("credit") || 
        lowerMsg.includes("insufficient") || 
        lowerMsg.includes("fund") ||
        lowerMsg.includes("lamports")
      ) {
        showAlert(
          "Saldo Insuficiente en Wallet",
          "No cuentas con saldo suficiente de SOL en tu wallet para cubrir la tarifa de almacenamiento del contrato en la blockchain. Por favor recarga fondos de prueba (Faucet Devnet) en tu wallet e intenta nuevamente.",
          "error"
        );
      } else if (lowerMsg.includes("user rejected") || lowerMsg.includes("canceled") || lowerMsg.includes("rejected")) {
        showAlert(
          "Operación Cancelada",
          "Se canceló la firma de la transacción desde tu wallet. El evento no fue publicado.",
          "info"
        );
      } else {
        showAlert(
          "Error de Publicación",
          "No se pudo completar el registro del evento en la blockchain. Verifica tu conexión a internet y tu wallet e intenta nuevamente.",
          "error"
        );
      }
      setIsCreating(false);
    }
  };

  const handleNext = () => {
    setShowErrors(true);
    if (!validateStepData(wizardStep)) {
      return;
    }
    
    setWizardStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrev = () => {
    setWizardStep(prev => Math.max(prev - 1, 1));
  };

  const metaParts = [];
  if (date) {
    const d = new Date(date + 'T12:00');
    metaParts.push(d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  }
  if (time) metaParts.push(`${time} h`);
  if (venue) metaParts.push(venue);
  
  const displayMeta = metaParts.length > 0 ? metaParts.join(' · ') : 'Fecha · Hora · Lugar';
  
  const totalAforo = zones.reduce((acc, z) => acc + z.capacity, 0);
  const minPrice = zones.length > 0 ? Math.min(...zones.map(z => z.price)) : 0;
  const displayPrice = minPrice === 0 ? 'Gratis' : `Desde $${minPrice}`;

  // Costo real on-chain obtenido dinámicamente desde el RPC de Solana
  const estimatedSolFee = dynamicSolFee;

  if (createdEventData) {
    return (
      <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F8F7' }}>
        <div style={{ background: '#FFF', padding: '40px', borderRadius: '16px', border: '1px solid #E8E6E0', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#EAF3DE', color: '#4BAA46', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Icons.Check size={32} strokeWidth={3} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#1E1E1E' }}>¡Contrato desplegado con éxito!</h2>
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#5F5E5A', lineHeight: 1.5 }}>Tu evento <strong>{createdEventData.name}</strong> se ha registrado en la blockchain de Solana y ya está listo para emitir entradas.</p>
          
          <div style={{ background: '#F8F9F8', border: '1px solid #D3D1C7', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#5F5E5A' }}>Colección de Boletos (NFT)</p>
              <p style={{ margin: 0, fontSize: '13px', fontFamily: 'monospace', color: '#1E1E1E', wordBreak: 'break-all' }}>{createdEventData.collectionMint}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#5F5E5A' }}>Contrato del Evento</p>
              <p style={{ margin: 0, fontSize: '13px', fontFamily: 'monospace', color: '#1E1E1E', wordBreak: 'break-all' }}>{createdEventData.address}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#5F5E5A' }}>Bóveda de Fondos (Escrow)</p>
              <p style={{ margin: 0, fontSize: '13px', fontFamily: 'monospace', color: '#1E1E1E', wordBreak: 'break-all' }}>{createdEventData.escrowVault}</p>
            </div>
          </div>

          <div style={{ background: '#F4F4F5', border: '1px solid #E4E4E7', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icons.Link size={16} color="#18181B" />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#18181B' }}>Enlace de Compra (Blink)</p>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#71717A' }}>Comparte este enlace para que tus usuarios puedan comprar boletos:</p>
            <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ flex: 1, fontSize: '13px', color: '#27272A', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/purchase/{createdEventData.id}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/purchase/${createdEventData.id}`);
                  showAlert("Enlace copiado", "El enlace de compra ha sido copiado al portapapeles.", "success");
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#14F195', display: 'flex', alignItems: 'center' }}
              >
                <Icons.Copy size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#EAF3DE', padding: '16px', borderRadius: '12px', marginBottom: '32px', textAlign: 'left' }}>
            <Icons.Mail size={24} color="#27500A" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#173404' }}>Confirmación enviada</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#27500A' }}>Te hemos enviado un correo electrónico con el recibo y los detalles técnicos de esta transacción.</p>
            </div>
          </div>

          <button onClick={() => onSuccess(createdEventData)} style={{ width: '100%', background: '#14F195', color: '#1E1E1E', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(20, 241, 149, 0.25)' }}>
            Continuar al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      padding: '32px 40px', 
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#5F5E5A', fontWeight: 500 }}>Mis eventos / Nuevo evento</p>
      <p style={{ margin: '0 0 24px', fontSize: '22px', fontWeight: 600, color: '#1E1E1E' }}>Crear evento</p>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        {[
          { step: 1, label: 'Información' },
          { step: 2, label: 'Zonas y precios' },
          { step: 3, label: 'Reglas' },
          { step: 4, label: 'Revisar' }
        ].map((s, i) => (
          <Fragment key={s.step}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {wizardStep > s.step ? (
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EAF3DE', color: '#27500A', fontSize: '13px', textAlign: 'center', lineHeight: '28px', fontWeight: 700 }}>✓</span>
              ) : wizardStep === s.step ? (
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#14F195', color: '#1E1E1E', fontSize: '13px', textAlign: 'center', lineHeight: '28px', fontWeight: 700 }}>{s.step}</span>
              ) : (
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #D3D1C7', color: '#5F5E5A', fontSize: '13px', textAlign: 'center', lineHeight: '26px' }}>{s.step}</span>
              )}
              <span style={{ fontSize: wizardStep === s.step ? '14px' : '13px', color: wizardStep === s.step ? '#1E1E1E' : '#5F5E5A', fontWeight: wizardStep === s.step ? 600 : 400 }}>{s.label}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: '2px', background: wizardStep > s.step ? '#14F195' : '#E8E6E0', margin: '0 12px' }} />}
          </Fragment>
        ))}
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        {wizardStep === 1 && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>Detalles básicos</p>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#5F5E5A' }}>Ingresa la información pública de tu evento.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.name) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '6px' }}>Nombre del evento *</label>
                <input type="text" placeholder="Ej. Noche de Jazz — Roma Norte" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.name) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.description) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '6px' }}>Descripción *</label>
                <textarea placeholder="Cuéntale a tu público de qué se trata..." maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.description) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', minHeight: '85px', resize: 'vertical', background: '#FFFFFF', color: '#1E1E1E' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.category) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '6px' }}>Categoría *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.category) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }}>
                  <option value="">Selecciona</option><option>Festivales</option><option>Conciertos</option><option>Bares y venues</option><option>Teatro</option><option>Deportes</option><option>Conferencias</option><option>Stand-up / Comedia</option><option>Arte y Exposiciones</option><option>Cultura</option><option>Escuelas</option><option>Networking</option><option>Gastronomía</option><option>Comunidades</option>
                </select>
              </div>

              {/* Imágenes del Evento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '2px' }}>Imagen de Portada (Banner)</label>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#8A8880' }}>Recomendado: 16:9 (1200 × 675 px)</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '36px', borderRadius: '6px', background: coverImage ? `url(${coverImage}) center/cover` : '#E5E5E5', flexShrink: 0, border: '1px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!coverImage && <Icons.Image size={16} color="#8A8880" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/portada.jpg" 
                      value={coverImage} 
                      onChange={(e) => setCoverImage(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} 
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'block', marginBottom: '2px' }}>Arte del Ticket Digital (Opcional)</label>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#8A8880' }}>Recomendado: 1:1 (800 × 800 px)</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: (ticketImage || coverImage) ? `url(${ticketImage || coverImage}) center/cover` : '#E5E5E5', flexShrink: 0, border: '1px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!(ticketImage || coverImage) && <Icons.Ticket size={16} color="#8A8880" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/ticket.jpg (opcional)" 
                      value={ticketImage} 
                      onChange={(e) => setTicketImage(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Galería Adicional */}
              <div style={{ marginTop: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  Galería del Evento (Opcional)
                  <button onClick={() => setGallery([...gallery, ''])} style={{ background: 'none', border: 'none', color: '#14F195', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Añadir foto</button>
                </label>
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#8A8880' }}>Añade más fotos para mostrar en la página de tu evento.</p>
                {gallery.length === 0 && (
                  <div style={{ padding: '16px', border: '1px dashed #D3D1C7', borderRadius: '8px', textAlign: 'center', color: '#8A8880', fontSize: '12px', cursor: 'pointer' }} onClick={() => setGallery([''])}>
                    Da clic aquí para añadir imágenes a la galería
                  </div>
                )}
                {gallery.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '48px', height: '36px', borderRadius: '6px', background: url ? `url(${url}) center/cover` : '#E5E5E5', flexShrink: 0, border: '1px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!url && <Icons.Image size={16} color="#8A8880" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://ejemplo.com/foto.jpg" 
                      value={url} 
                      onChange={(e) => {
                        const newGallery = [...gallery];
                        newGallery[idx] = e.target.value;
                        setGallery(newGallery);
                      }} 
                      style={{ flex: 1, padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} 
                    />
                    <button onClick={() => setGallery(gallery.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#B0523E', cursor: 'pointer', padding: '8px' }}>
                      <Icons.Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Fecha y Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.date) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '6px' }}>Fecha del evento *</label>
                  <div 
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && typeof input.showPicker === 'function') input.showPicker();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: '#FFFFFF',
                      border: (showErrors && errors.date) ? '1px solid #B0523E' : '1px solid #D3D1C7',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icons.Calendar size={18} color="#4BAA46" />
                    <input 
                      type="date" 
                      min={new Date().toISOString().split('T')[0]}
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#1E1E1E', cursor: 'pointer', fontFamily: 'inherit' }} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.time) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '6px' }}>Hora del evento (Inicio) *</label>
                  <div 
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && typeof input.showPicker === 'function') input.showPicker();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: '#FFFFFF',
                      border: (showErrors && errors.time) ? '1px solid #B0523E' : '1px solid #D3D1C7',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icons.Clock size={18} color="#534AB7" />
                    <input 
                      type="time" 
                      value={time} 
                      onChange={e => setTime(e.target.value)} 
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#1E1E1E', cursor: 'pointer', fontFamily: 'inherit' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {['18:00', '19:00', '20:00', '21:00'].map(t => (
                      <span key={t} onClick={() => setTime(t)} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: time === t ? '#14F195' : '#F1F1EE', color: '#1E1E1E', cursor: 'pointer' }}>{t} h</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloque de Ubicación Original */}
              <div style={{ background: '#F7F8F7', border: '1px solid #D3D1C7', borderRadius: '12px', padding: '16px', marginTop: '4px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#1E1E1E' }}>Ubicación del evento</p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.venue) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '4px' }}>Lugar / Venue *</label>
                  <input type="text" placeholder="Ej. Foro Indie Rocks!" value={venue} onChange={e => setVenue(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.venue) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.country) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '4px' }}>País *</label>
                    <select value={countryIso} onChange={e => { setCountryIso(e.target.value); setStateIso(''); setCityName(''); }} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.country) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }}>
                      <option value="">Selecciona</option>
                      {availableCountries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.state) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '4px' }}>Estado/Provincia *</label>
                    <select value={stateIso} onChange={e => { setStateIso(e.target.value); setCityName(''); }} disabled={!countryIso} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.state) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: !countryIso ? '#E5E5E5' : '#FFFFFF', color: '#1E1E1E' }}>
                      <option value="">Selecciona</option>
                      {availableStates.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: (showErrors && errors.city) ? '#B0523E' : '#1E1E1E', display: 'block', marginBottom: '4px' }}>Ciudad *</label>
                    <select value={cityName} onChange={e => setCityName(e.target.value)} disabled={!stateIso} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.city) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: !stateIso ? '#E5E5E5' : '#FFFFFF', color: '#1E1E1E' }}>
                      <option value="">Selecciona</option>
                      {availableCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: (showErrors && errors.doorTime) ? '#B0523E' : '#1E1E1E', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Apertura de puertas (Ingreso) *</label>
                  <div 
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && typeof input.showPicker === 'function') input.showPicker();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: '#FFFFFF',
                      border: (showErrors && errors.doorTime) ? '1px solid #B0523E' : '1px solid #D3D1C7',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Icons.DoorOpen size={18} color="#1D9E75" />
                    <input 
                      type="time" 
                      value={doorTime} 
                      onChange={e => setDoorTime(e.target.value)} 
                      style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#1E1E1E', cursor: 'pointer', fontFamily: 'inherit' }} 
                    />
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: (showErrors && errors.ageRestriction) ? '#B0523E' : '#1E1E1E', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Clasificación de edad *</label>
                  <select value={ageRestriction} onChange={e => setAgeRestriction(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: (showErrors && errors.ageRestriction) ? '1px solid #B0523E' : '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E', height: '43px' }}>
                    <option value="">Selecciona clasificación *</option>
                    <option value="Todas las edades">Todas las edades</option>
                    <option value="+14">+14</option>
                    <option value="+18">+18 (Solo Adultos)</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>Zonas de tu evento</p>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#5F5E5A' }}>Así se verán para el comprador: configura aforo, precio y posición.</p>

            {zones.map((zone, idx) => (
              <div key={zone.id} style={{ border: idx === 0 ? '2px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '10px', padding: '12px 14px', marginBottom: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#5F5E5A', fontWeight: 600 }}>Nombre de zona</p>
                  <input type="text" value={zone.name} onChange={e => { const z = [...zones]; z[idx] = { ...z[idx], name: e.target.value }; setZones(z); }} style={{ width: '100%', border: '1px solid #D3D1C7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1E1E1E', background: '#FFFFFF', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#5F5E5A', fontWeight: 600 }}>Precio por boleto (SOL) *</p>
                  <input 
                    type="number" 
                    step="any"
                    min="0"
                    placeholder="0.05"
                    value={zone.price === 0 && idx === zones.length - 1 && zone.name === '' ? '' : zone.price} 
                    onWheel={e => e.currentTarget.blur()}
                    onChange={e => { 
                      const val = e.target.value;
                      const parsed = val === '' ? 0 : parseFloat(val);
                      const z = [...zones]; 
                      z[idx] = { ...z[idx], price: isNaN(parsed) ? 0 : parsed }; 
                      setZones(z); 
                    }} 
                    style={{ width: '100%', border: '1px solid #D3D1C7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1E1E1E', background: '#FFFFFF', outline: 'none' }} 
                  />
                  <span style={{ fontSize: '10px', color: '#8A8880', marginTop: '2px', display: 'block' }}>
                    {zone.price === 0 ? '⚠️ 0 SOL (Solo organizadores en Whitelist)' : 'Mín. 0.01 SOL'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#5F5E5A', fontWeight: 600 }}>Aforo (Boletos)</p>
                  <input 
                    type="number" 
                    min="1"
                    step="1"
                    placeholder="100"
                    value={zone.capacity === 0 && idx === zones.length - 1 && zone.name === '' ? '' : zone.capacity} 
                    onWheel={e => e.currentTarget.blur()}
                    onChange={e => { 
                      const val = e.target.value;
                      const parsed = parseInt(val);
                      const z = [...zones]; 
                      z[idx] = { ...z[idx], capacity: isNaN(parsed) ? 0 : parsed }; 
                      setZones(z); 
                    }} 
                    style={{ width: '100%', border: '1px solid #D3D1C7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1E1E1E', background: '#FFFFFF', outline: 'none' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#5F5E5A', fontWeight: 600 }}>Ubicación visual</p>
                  <select value={zone.position || 'general'} onChange={e => { const z = [...zones]; z[idx] = { ...z[idx], position: e.target.value }; setZones(z); }} style={{ width: '100%', border: '1px solid #D3D1C7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1E1E1E', background: '#FFFFFF', outline: 'none' }}>
                    <option value="frente">Frente / Escenario</option>
                    <option value="izquierda">Lado Izquierdo</option>
                    <option value="derecha">Lado Derecho</option>
                    <option value="atras">Atrás / Medio</option>
                    <option value="general">Área General</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#5F5E5A', fontWeight: 600 }}>Puerta (Opcional)</p>
                  <input type="text" placeholder="Ej. Puerta 4" value={zone.gate || ''} onChange={e => { const z = [...zones]; z[idx] = { ...z[idx], gate: e.target.value }; setZones(z); }} style={{ width: '100%', border: '1px solid #D3D1C7', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1E1E1E', background: '#FFFFFF', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={zone.isNumbered || false} onChange={e => { const z = [...zones]; z[idx] = { ...z[idx], isNumbered: e.target.checked }; setZones(z); }} /> Asientos Num.
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '14px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button type="button" disabled={idx === 0} onClick={() => moveZone(idx, -1)} style={{ background: 'transparent', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.2 : 0.6, padding: 0 }} title="Mover arriba">
                      <Icons.ChevronUp size={16} color="#1E1E1E" />
                    </button>
                    <button type="button" disabled={idx === zones.length - 1} onClick={() => moveZone(idx, 1)} style={{ background: 'transparent', border: 'none', cursor: idx === zones.length - 1 ? 'default' : 'pointer', opacity: idx === zones.length - 1 ? 0.2 : 0.6, padding: 0 }} title="Mover abajo">
                      <Icons.ChevronDown size={16} color="#1E1E1E" />
                    </button>
                  </div>
                  {zones.length > 1 && (
                    <button type="button" onClick={() => setZones(zones.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.8 }} title="Eliminar zona">
                      <Icons.Trash2 size={14} color="#B0523E" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div onClick={() => setZones([...zones, { id: Math.random().toString(), name: '', capacity: 0, price: 0, position: 'general' }])} style={{ border: '1px dashed #D3D1C7', borderRadius: '10px', padding: '10px', textAlign: 'center', fontSize: '13px', color: '#4BAA46', marginBottom: '20px', cursor: 'pointer', fontWeight: 600 }}>+ Agregar otra zona</div>

            <div style={{ background: '#F7F8F7', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#1E1E1E' }}>Vista previa para el comprador (Mapa 2D)</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {zones.map((zone, idx) => zone.position === 'izquierda' && (
                    <div key={zone.id} style={{ border: idx === 0 ? '1px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', color: idx === 0 ? '#3C3489' : '#5F5E5A', background: '#FFFFFF' }}>{zone.name || 'Nueva zona'} · ${zone.price || 0}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ background: '#2C2C2A', color: '#B4B2A9', textAlign: 'center', fontSize: '10px', padding: '5px', borderRadius: '5px', marginBottom: '2px', fontWeight: 600 }}>ESCENARIO</div>
                  {zones.map((zone, idx) => zone.position === 'frente' && (
                    <div key={zone.id} style={{ border: idx === 0 ? '1px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', color: idx === 0 ? '#3C3489' : '#5F5E5A', background: '#FFFFFF' }}>{zone.name || 'Nueva zona'} · ${zone.price || 0}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {zones.map((zone, idx) => zone.position === 'derecha' && (
                    <div key={zone.id} style={{ border: idx === 0 ? '1px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', color: idx === 0 ? '#3C3489' : '#5F5E5A', background: '#FFFFFF' }}>{zone.name || 'Nueva zona'} · ${zone.price || 0}</div>
                  ))}
                </div>
              </div>

              {zones.filter(z => z.position === 'atras').length > 0 && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {zones.map((zone, idx) => zone.position === 'atras' && (
                    <div key={zone.id} style={{ flex: '1 1 auto', minWidth: '80px', border: idx === 0 ? '1px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', color: idx === 0 ? '#3C3489' : '#5F5E5A', background: '#FFFFFF' }}>{zone.name || 'Nueva zona'} · ${zone.price || 0}</div>
                  ))}
                </div>
              )}

              {zones.filter(z => !z.position || z.position === 'general').length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {zones.map((zone, idx) => (!zone.position || zone.position === 'general') && (
                    <div key={zone.id} style={{ flex: '1 1 auto', minWidth: '80px', border: idx === 0 ? '1px solid #9945FF' : '1px solid #D3D1C7', borderRadius: '6px', padding: '6px', textAlign: 'center', fontSize: '11px', color: idx === 0 ? '#3C3489' : '#5F5E5A', background: '#FFFFFF' }}>{zone.name || 'Nueva zona'} · ${zone.price || 0}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1E1E1E' }}>Reglas del evento y protección</p>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#5F5E5A' }}>Configura las políticas de seguridad, reventa y devoluciones.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Leyenda explicativa de Entradas Nominativas por defecto */}
              <div style={{ border: '1px solid #D3D1C7', borderRadius: '12px', padding: '16px 18px', background: '#F7F8F7', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <Icons.Lock size={22} color="#534AB7" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1E1E1E', fontWeight: 700 }}>Entradas Nominativas e Intransferibles por defecto</p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5F5E5A', lineHeight: '1.4' }}>
                    Todas las entradas en Mintpass nacen nominativas (vinculadas a la identidad del comprador) para evitar la reventa ilegal externa y la especulación de bots.
                  </p>
                </div>
              </div>

              {/* Toggle de Reventa Protegida */}
              <div style={{ border: '1px solid #D3D1C7', borderRadius: '12px', padding: '18px 20px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Icons.Repeat size={20} color="#4BAA46" style={{ marginTop: '2px' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1E1E1E', fontWeight: 700 }}>Permitir Reventa Protegida en Mintpass</p>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5F5E5A' }}>
                        Permite que los asistentes intercambien entradas dentro del mercado oficial de Mintpass con un tope de precio controlado.
                      </p>
                    </div>
                  </div>
                  <div 
                    className={`toggle ${allowResale ? 'on' : ''}`} 
                    onClick={() => {
                      const nextResale = !allowResale;
                      setAllowResale(nextResale);
                      setIsSoulbound(!nextResale); // Si se activa reventa, deja de ser 100% nominativa pura
                    }} 
                    style={{ width: '40px', height: '24px', borderRadius: '12px', background: allowResale ? '#14F195' : '#D3D1C7', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: allowResale ? '18px' : '2px', transition: 'left 0.2s' }}></div>
                  </div>
                </div>
                {allowResale && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #E5E5E5', paddingTop: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#1E1E1E', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Tope máximo sobreprecio de reventa (%)</label>
                    <input type="number" onWheel={e => e.currentTarget.blur()} placeholder="Ej. 15 (máximo 15% sobre el precio original)" value={resaleCapLimit} onChange={e => setResaleCapLimit(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #E8E6E0', borderRadius: '12px', padding: '20px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <Icons.Undo2 size={20} color="#1D9E75" style={{ marginTop: '2px' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1E1E1E', fontWeight: 700 }}>Permitir Devoluciones</p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#5F5E5A' }}>Permite a los asistentes solicitar reembolso antes de la fecha del evento.</p>
                    </div>
                  </div>
                  <div className={`toggle ${allowRefunds ? 'on' : ''}`} onClick={() => setAllowRefunds(!allowRefunds)} style={{ width: '40px', height: '24px', borderRadius: '12px', background: allowRefunds ? '#14F195' : '#D3D1C7', position: 'relative', cursor: 'pointer' }}><div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: allowRefunds ? '18px' : '2px', transition: 'left 0.2s' }}></div></div>
                </div>
                {allowRefunds && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid #E5E5E5', paddingTop: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#5F5E5A', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Días límite antes del evento para devolución</label>
                    <input type="number" onWheel={e => e.currentTarget.blur()} placeholder="Ej. 3" value={refundTimeLimit} onChange={e => setRefundTimeLimit(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E', marginBottom: '8px' }} />
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #E8E6E0', borderRadius: '12px', padding: '20px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Icons.Shield size={20} color="#5F5E5A" style={{ marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '14px', color: '#1E1E1E', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Límite de Compra por Comprador</label>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#5F5E5A' }}>Evita el acaparamiento estableciendo un número máximo de entradas por usuario.</p>
                    <input type="number" onWheel={e => e.currentTarget.blur()} placeholder="Ej. 2 (deja vacío para sin límite)" value={identityLimit} onChange={e => setIdentityLimit(e.target.value)} style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #D3D1C7', outline: 'none', background: '#FFFFFF', color: '#1E1E1E' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {wizardStep === 4 && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1E1E1E' }}>Revisión Final</p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#5F5E5A' }}>Verifica la información antes de publicar tu evento.</p>

            <div style={{ background: '#F8F9F8', border: '1px solid #E8E6E0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: coverImage ? `url(${coverImage}) center/cover` : '#E8E6E0' }}></div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E1E1E' }}>{name || 'Evento sin nombre'}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#5F5E5A' }}>{displayMeta}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #E5E5E5', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Zonas activas</span>
                  <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 700 }}>{zones.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Capacidad total</span>
                  <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 700 }}>{totalAforo} entradas</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Reventa Oficial</span>
                  <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 700 }}>{allowResale ? `Habilitada (Tope: ${resaleCapLimit||'Sin tope'}%)` : 'Deshabilitada'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Devoluciones</span>
                  <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 700 }}>{allowRefunds ? `Permitidas (Hasta ${refundTimeLimit||'0'} días antes)` : 'No permitidas'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Precio de entrada</span>
                  <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 700 }}>{displayPrice}</span>
                </div>
              </div>
            </div>

            {/* Tarjeta de Costos en Solana */}
            <div style={{ border: '1px solid #D3D1C7', borderRadius: '12px', padding: '18px 20px', background: '#FFFFFF', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Icons.Activity size={20} color="#14F195" />
                  <div>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E1E1E' }}>Costos de Blockchain (Solana)</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#5F5E5A' }}>Tarifas de red descentralizada y almacenamiento.</p>
                  </div>
                </div>
                {walletBalanceSol !== null && (
                  <div style={{ background: '#EAF3DE', border: '1px solid #C0DD9D', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4BAA46' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#173404' }}>Saldo: {walletBalanceSol} SOL</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#5F5E5A' }}>Renta on-chain (Colección Metaplex)</span>
                <span style={{ fontSize: '13px', color: '#1E1E1E', fontWeight: 600 }}>~{estimatedSolFee} SOL</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E5E5', paddingTop: '14px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E1E1E' }}>Total a autorizar</span>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#5F5E5A' }}>+ Network Fee (calculado por tu wallet)</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#1E1E1E', display: 'block' }}>
                    {estimatedSolFee} SOL
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#F8F9F8', border: '1px solid #E8E6E0', padding: '16px', borderRadius: '12px' }}>
              <Icons.CheckCircle2 size={20} color="#4BAA46" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1E1E1E' }}>Al publicar tu evento:</strong>
                <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#5F5E5A' }}>
                  <li>Tus entradas quedan autenticadas y listas para venta instantánea.</li>
                  <li>Obtienes un enlace directo (Blink) para compartir tu evento en redes sociales.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', alignItems: 'center', position: 'relative' }}>
        <div onClick={wizardStep === 1 ? onBack : handlePrev} style={{ border: '1px solid #D3D1C7', color: '#5F5E5A', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>Atrás</div>
        {Object.keys(errors).length > 0 && showErrors && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: '#D85A30', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.AlertCircle size={14} /> Faltan campos requeridos o hay errores</div>}
        
        {wizardStep < 4 ? (
          <div onClick={handleNext} style={{ background: '#14F195', color: '#1E1E1E', padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s' }}>Siguiente: {wizardStep === 1 ? 'Zonas y precios' : wizardStep === 2 ? 'Reglas' : 'Revisar'}</div>
        ) : (
          <button onClick={handleCreate} disabled={!isFilled || isCreating} style={{ background: '#14F195', color: '#1E1E1E', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: (!isFilled || isCreating) ? 0.5 : 1, transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(20, 241, 149, 0.25)' }}>
            {isCreating ? 'Publicando evento...' : '🚀 Publicar Evento'}
          </button>
        )}
      </div>

      </div>

      <AlertModal {...alertConfig} />
    </div>
  );
}
