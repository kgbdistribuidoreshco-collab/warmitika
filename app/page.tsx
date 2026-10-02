"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, Scissors, ChevronRight, ChevronLeft, 
  X, Check, MapPin, Sparkles, MessageCircle, 
  Users, Settings, LogOut, Camera, Lock, 
  Edit, Trash2, Plus, AlertCircle, Flower2,
  ArrowUpDown, Copy, RefreshCw, UserCheck
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

export interface ServiceItem {
  id: string;
  category: string;
  name: string;
  price: string;
  duration: string;
  image: string;
  description: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  service: string;
  days: number;
}

export interface StaffItem {
  id: string;
  name: string;
  specialty: string;
  roles: string[];
}

export interface TemplateItem {
  id: string;
  name: string;
  content: string;
}

const getFirebaseConfig = (): Record<string, string | undefined> => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.error("Error leyendo __firebase_config:", e);
    }
  }
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
  }
  return {
    apiKey: "AIzaSyBQs4J79dkfA3BtALwF4M8goJyZqarJh08",
    authDomain: "warmi-tika-studio.firebaseapp.com",
    projectId: "warmi-tika-studio",
    storageBucket: "warmi-tika-studio.firebasestorage.app",
    messagingSenderId: "558257027429",
    appId: "1:558257027429:web:af8790d76470fe7318498c"
  };
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) 
  : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' 
  ? __app_id 
  : (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_ID ? process.env.NEXT_PUBLIC_APP_ID : 'warmi-tika-studio');

const DEFAULT_HERO_BG = "https://i.imgur.com/mD1A455.png";
const DEFAULT_CARD_BG = "https://i.imgur.com/mD1A455.png";

const SERVICE_CATEGORIES = ['Cabello', 'Uñas', 'Cejas', 'Pestañas', 'Labios'];

// Calcula automáticamente los días transcurridos si tiene fecha DD/MM/YYYY o usa el campo days
const getEffectiveDays = (cust: CustomerItem | undefined): number => {
  if (!cust) return 30;
  const manualDays = Number(cust.days);
  if (!isNaN(manualDays) && manualDays > 0) return manualDays;
  if (cust.lastVisit) {
    const parts = cust.lastVisit.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) {
        const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) return diff;
      }
    }
  }
  return 30;
};

interface LogoProps {
  className?: string;
  color?: 'default' | 'white';
}

const Logo: React.FC<LogoProps> = ({ className = "h-12", color = "default" }) => (
  <div className={`flex items-center justify-start ${className}`}>
    <img 
      src="https://i.imgur.com/hiJkL1K.png" 
      alt="Warmi T'ika | Beauty Studio" 
      className={`max-h-full w-auto object-contain transition-all duration-300 ${
        color === 'white' ? 'brightness-0 invert opacity-100 drop-shadow-md' : 'drop-shadow-sm'
      }`}
    />
  </div>
);

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick, 
  disabled = false, 
  type = 'button' 
}) => {
  const baseStyle = "inline-flex items-center justify-center px-5 py-2.5 rounded-full font-medium transition-all duration-300 cursor-pointer";
  const variants: Record<string, string> = {
    primary: "bg-gradient-to-r from-[#70415D] to-[#9b5d7e] text-white hover:opacity-95 shadow-md hover:shadow-lg",
    secondary: "bg-[#B87583] text-white hover:bg-[#a16270] shadow-sm",
    outline: "border-2 border-[#B87583] text-[#70415D] bg-white/80 backdrop-blur-sm hover:bg-[#FFF8F5]",
    ghost: "text-[#70415D] hover:bg-[#FFF8F5]/80",
    danger: "bg-red-600 text-white hover:bg-red-700",
    whatsapp: "bg-[#2e7d5b] hover:bg-[#246649] text-white border border-[#879681]/40 shadow-md"
  };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-[#342A30]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#FFF8F5] rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-[#C38296]/30">
        <div className="sticky top-0 z-10 flex justify-between items-center p-5 border-b border-[#C38296]/20 bg-white/90 backdrop-blur-md">
          <h3 className="font-serif text-xl text-[#70415D] flex items-center gap-2">
            <Flower2 size={18} className="text-[#B87583]" /> {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-[#70415D] transition-colors bg-[#FFF8F5] rounded-full p-2"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 bg-white/95">
          {children}
        </div>
      </div>
    </div>
  );
};

const initialMockServices: ServiceItem[] = [
  { id: 's1', category: 'Cabello', name: 'Balayage Iluminado', price: 'Desde S/ 150', duration: '180 min', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600', description: 'Técnica de coloración a mano alzada para un acabado natural, suave y luminoso.' },
  { id: 's2', category: 'Cabello', name: 'Corte Boutique + Tratamiento Capilar', price: 'S/ 60', duration: '60 min', image: 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=600', description: 'Asesoría de imagen personalizada, lavado con hidratación profunda, corte y brushing profesional.' },
  { id: 's3', category: 'Uñas', name: 'Manicure Acrílica Boutique', price: 'S/ 80', duration: '90 min', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&q=80&w=600', description: 'Extensión esculpida, limpieza profunda de cutículas y esmaltado en gel de larga duración.' },
  { id: 's4', category: 'Uñas', name: 'Pedicure Boutique', price: 'S/ 50', duration: '60 min', image: 'https://images.unsplash.com/photo-1516975080661-460d3fcb640c?auto=format&fit=crop&q=80&w=600', description: 'Exfoliación renovadora, masaje relajante e hidratación profunda.' },
  { id: 's5', category: 'Cejas', name: 'Laminado + Diseño de Cejas', price: 'S/ 50', duration: '45 min', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600', description: 'Fijación orgánica del vello para lograr cejas definidas, armoniosas y con volumen.' },
  { id: 's6', category: 'Pestañas', name: 'Lifting Nutritivo + Tinte', price: 'S/ 60', duration: '60 min', image: 'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&q=80&w=600', description: 'Realza tu mirada con una curvatura natural y keratina fortalecedora para tus pestañas.' },
  { id: 's7', category: 'Labios', name: 'Hidratación de Rosas y Ácido Hialurónico', price: 'S/ 40', duration: '30 min', image: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=600', description: 'Velo nutritivo y regenerador para devolver la suavidad y frescura a los labios.' }
];

const initialMockStaff: StaffItem[] = [
  { id: 'st1', name: 'Elena', specialty: 'Especialista en Cabello y Alisados', roles: ['Cabello'] },
  { id: 'st2', name: 'Sofía', specialty: 'Especialista en Uñas y Mirada', roles: ['Uñas', 'Cejas', 'Pestañas', 'Labios'] }
];

const mockInactiveCustomers: CustomerItem[] = [
  { id: 'c1', name: 'Valeria Mendoza', phone: '912345678', lastVisit: '22/08/2026', service: 'Balayage Iluminado', days: 45 },
  { id: 'c2', name: 'Carla Rojas', phone: '987654321', lastVisit: '30/08/2026', service: 'Manicure Acrílica', days: 32 },
  { id: 'c3', name: 'Luciana Paredes', phone: '955443322', lastVisit: '10/08/2026', service: 'Lifting Nutritivo + Tinte', days: 58 }
];

const ANTI_SPAM_TEMPLATES: TemplateItem[] = [
  { id: 't1', name: '1. Cariño y días exactos', content: "Hola {{nombre}} 🌷 ¡Qué lindo saludarte! Vimos que ya pasaron {{dias}} días desde tu visita para {{servicio}} en Warmi T'ika | Beauty Studio. Te extrañamos y preparamos {{beneficio}} con tu código {{codigo}} (válido hasta el {{fecha_vencimiento}}). ¡Te adjunto tu tarjeta VIP!" },
  { id: 't2', name: '2. Momento de engreírte', content: "¡Hola, {{nombre}}! 🌸 Hace {{dias}} días tuvimos el gusto de atenderte en Warmi T'ika | Beauty Studio para tu {{servicio}}. Sabemos que siempre viene bien una pausa para ti, así que tienes {{beneficio}} usando el código {{codigo}} hasta el {{fecha_vencimiento}}." },
  { id: 't3', name: '3. Retoque de tu servicio favorito', content: "Hola {{nombre}} ✨ ¿Cómo has estado? Notamos que hace {{dias}} días te realizaste {{servicio}} con nosotras. Para que vuelvas a lucir radiante en Warmi T'ika | Beauty Studio, te regalamos {{beneficio}} con el código {{codigo}}." },
  { id: 't4', name: '4. Invitación especial de temporada', content: "Querida {{nombre}} 🌺 Pasaron {{dias}} días desde la última vez que nos visitaste en Warmi T'ika | Beauty Studio para tu {{servicio}}. Queremos volver a consentirte como mereces con {{beneficio}} especial para ti (Código: {{codigo}})." },
  { id: 't5', name: '5. Pausa de belleza en el estudio', content: "Hola {{nombre}} 🌷 En Warmi T'ika | Beauty Studio nos encantará volver a recibirte después de estos {{dias}} días sin verte. Te dejamos aquí tu tarjeta con {{beneficio}} (código {{codigo}}) para que agendes tu próximo momento de cuidado." },
  { id: 't6', name: '6. Saludo cálido y beneficio VIP', content: "¡Hola {{nombre}}! 🌸 Qué alegría escribirte. Ya son {{dias}} días sin verte por el estudio luego de tu {{servicio}}. Tenemos listo para ti {{beneficio}} con el código {{codigo}} hasta el {{fecha_vencimiento}}." },
  { id: 't7', name: '7. Tu espacio favorito te espera', content: "Hola, {{nombre}} 💐 Tu rincón favorito en Warmi T'ika | Beauty Studio te espera. Como han pasado {{dias}} días desde tu última cita de {{servicio}}, queremos obsequiarte {{beneficio}} presentando esta tarjetita con el código {{codigo}}." },
  { id: 't8', name: '8. Renueva tu estilo con nosotras', content: "¡Buen día, {{nombre}}! 🌷 Hace {{dias}} días compartimos tu sesión de {{servicio}}. Cuando quieras renovar tu look o relajarte, cuentas con {{beneficio}} exclusivo en Warmi T'ika | Beauty Studio (código: {{codigo}})." },
  { id: 't9', name: '9. Detalle exclusivo por fidelidad', content: "Hola {{nombre}} ✨ Gracias por confiar en Warmi T'ika | Beauty Studio hace {{dias}} días para tu {{servicio}}. Como detalle especial para tu regreso, activamos {{beneficio}} a tu nombre con el código {{codigo}}." },
  { id: 't10', name: '10. Recordatorio amable de cuidado', content: "Hola, {{nombre}} 🌸 ¡Esperamos que estés súper bien! Ya cumplimos {{dias}} días desde tu último {{servicio}}. Te enviamos esta invitación con {{beneficio}} (código {{codigo}}) para cuando gustes visitarnos." },
  { id: 't11', name: '11. Experiencia Beauty Studio', content: "¡Hola {{nombre}}! 🌷 Hace {{dias}} días que no coincidimos en Warmi T'ika | Beauty Studio. Te esperamos con la mejor atención y {{beneficio}} especial para ti usando el código {{codigo}} antes del {{fecha_vencimiento}}." },
  { id: 't12', name: '12. Regalo personalizado Warmi T\'ika', content: "Querida {{nombre}} 🌺 Preparamos esta tarjeta personalizada porque hace {{dias}} días no te vemos por el estudio desde tu {{servicio}}. Disfruta de {{beneficio}} en tu próxima reserva con el código {{codigo}}." },
  { id: 't13', name: '13. Brillo y renovación', content: "Hola {{nombre}} ✨ ¿Lista para engreírte hoy? Pasaron {{dias}} días desde tu {{servicio}} en Warmi T'ika | Beauty Studio y queremos consentirte con {{beneficio}} (Código: {{codigo}})." },
  { id: 't14', name: '14. Invitación dulce sin presiones', content: "Hola, {{nombre}} 🌸 Te saludamos con mucho cariño desde Warmi T'ika | Beauty Studio. Vimos que hace {{dias}} días nos visitaste para {{servicio}} y te dejamos {{beneficio}} con el código {{codigo}} para cuando te provoque regresar." },
  { id: 't15', name: '15. Cuidado para ti', content: "¡Hola {{nombre}}! 🌷 Mereces un momento solo para ti. Después de {{dias}} días de tu última visita, en Warmi T'ika | Beauty Studio te regalamos {{beneficio}} con tu código personal {{codigo}}." },
  { id: 't16', name: '16. Especialista lista para atenderte', content: "Hola {{nombre}} 💐 Nuestro equipo de Warmi T'ika | Beauty Studio te recuerda con mucho cariño tras {{dias}} días de tu {{servicio}}. Usa esta tarjeta con {{beneficio}} (código {{codigo}}) en tu próxima cita." },
  { id: 't17', name: '17. Tardes de belleza en el estudio', content: "¡Hola, {{nombre}}! 🌸 Ya van {{dias}} días desde que estuviste en Warmi T'ika | Beauty Studio. Si deseas agendar esta semana, tienes activo {{beneficio}} con el código {{codigo}} hasta el {{fecha_vencimiento}}." },
  { id: 't18', name: '18. Mimo garantizado', content: "Hola {{nombre}} 🌷 Queremos que vuelvas a vivir la experiencia Warmi T'ika | Beauty Studio. Como pasaron {{dias}} días desde tu última atención de {{servicio}}, tienes {{beneficio}} listo con el código {{codigo}}." },
  { id: 't19', name: '19. Tu tarjeta de descuento personal', content: "¡Hola {{nombre}}! ✨ Te adjuntamos tu pase especial de Warmi T'ika | Beauty Studio. Hace {{dias}} días realizamos tu {{servicio}} y hoy tienes {{beneficio}} exclusivo con el código {{codigo}}." },
  { id: 't20', name: '20. Mensaje corto y directo anti-spam', content: "Hola {{nombre}} 🌸 ¡Te esperamos en Warmi T'ika | Beauty Studio! Ya pasaron {{dias}} días desde tu visita de {{servicio}} y tienes {{beneficio}} disponible con el código {{codigo}} (vence el {{fecha_vencimiento}})." }
];

interface CardBlobParams {
  customerFirstName: string;
  benefit: string;
  code: string;
  days: number;
  service: string;
  bgUrl: string;
}

const generateInvitationCardBlob = async ({ customerFirstName, benefit, code, days, service, bgUrl }: CardBlobParams): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const loadImage = (url: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

  const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
  grad.addColorStop(0, '#F6E6E8');
  grad.addColorStop(0.5, '#FFF8F5');
  grad.addColorStop(1, '#E8D5DA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1080);

  const bgImg = await loadImage(bgUrl || DEFAULT_CARD_BG);
  if (bgImg) {
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = 1;
    let sx = 0, sy = 0, sWidth = bgImg.width, sHeight = bgImg.height;

    if (imgRatio > canvasRatio) {
      sWidth = bgImg.height * canvasRatio;
      sx = (bgImg.width - sWidth) / 2;
    } else if (imgRatio < canvasRatio) {
      sHeight = bgImg.width / canvasRatio;
      sy = (bgImg.height - sHeight) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, 1080, 1080);
  } else {
    ctx.fillStyle = 'rgba(184, 117, 131, 0.18)';
    ctx.beginPath(); ctx.arc(120, 120, 220, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(960, 960, 220, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(135, 150, 129, 0.18)';
    ctx.beginPath(); ctx.arc(960, 140, 180, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(140, 960, 180, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 248, 245, 0.90)';
  ctx.beginPath();
  ctx.roundRect(110, 110, 860, 860, 44);
  ctx.fill();

  ctx.strokeStyle = '#B87583';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(112, 65, 93, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(132, 132, 816, 816, 32);
  ctx.stroke();

  const logoImg = await loadImage('https://i.imgur.com/hiJkL1K.png');
  if (logoImg) {
    const logoW = 460;
    const logoH = (logoImg.height / logoImg.width) * logoW;
    ctx.drawImage(logoImg, (1080 - logoW) / 2, 175, logoW, logoH);
  } else {
    ctx.fillStyle = '#70415D';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText("Warmi T'ika", 540, 240);
    ctx.fillStyle = '#B87583';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('BEAUTY STUDIO', 540, 280);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#879681';
  ctx.font = 'bold 23px sans-serif';
  ctx.fillText('✨ UN REGALO ESPECIAL PARA TI ✨', 540, 390);

  ctx.fillStyle = '#70415D';
  ctx.font = 'italic bold 82px Georgia, serif';
  ctx.fillText(customerFirstName || 'Hermosa', 540, 495);

  ctx.fillStyle = '#342A30';
  ctx.font = '26px sans-serif';
  ctx.fillText(`Hace ${days || 30} días te atendimos en ${service || 'nuestro estudio'}`, 540, 555);

  const pillGrad = ctx.createLinearGradient(240, 600, 840, 710);
  pillGrad.addColorStop(0, '#70415D');
  pillGrad.addColorStop(1, '#B87583');
  ctx.fillStyle = pillGrad;
  ctx.beginPath();
  ctx.roundRect(220, 600, 640, 115, 58);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText((benefit || '20% DE DESCUENTO').toUpperCase(), 540, 673);

  ctx.strokeStyle = 'rgba(195, 130, 150, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, 775);
  ctx.lineTo(830, 775);
  ctx.stroke();

  ctx.fillStyle = '#6B5B63';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CÓDIGO DE RESERVA PREFERENCIAL:', 540, 825);

  ctx.fillStyle = '#342A30';
  ctx.font = 'bold 44px monospace';
  ctx.fillText(code || 'WARMI20', 540, 880);

  ctx.fillStyle = '#879681';
  ctx.font = '20px sans-serif';
  ctx.fillText("Warmi T'ika | Beauty Studio • Presenta esta tarjeta por WhatsApp • Válido hasta el 30/10/2026", 540, 925);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
};

interface PublicNavbarProps {
  navigate: (route: string) => void;
  activeRoute: string;
  isCloudSynced: boolean;
}

const PublicNavbar: React.FC<PublicNavbarProps> = ({ navigate, activeRoute, isCloudSynced }) => (
  <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#C38296]/25 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 h-22 py-2 flex items-center justify-between">
      <div className="cursor-pointer flex items-center gap-3" onClick={() => navigate('home')}>
        <Logo className="h-16 md:h-20" />
      </div>
      <nav className="hidden md:flex gap-8 items-center">
        <button 
          onClick={() => navigate('home')} 
          className={`text-sm font-bold tracking-wide transition-colors ${activeRoute === 'home' ? 'text-[#70415D] underline decoration-[#B87583] decoration-2 underline-offset-8' : 'text-[#342A30] hover:text-[#B87583]'}`}
        >
          Inicio
        </button>
        <button 
          onClick={() => navigate('catalog')} 
          className={`text-sm font-bold tracking-wide transition-colors ${activeRoute === 'catalog' ? 'text-[#70415D] underline decoration-[#B87583] decoration-2 underline-offset-8' : 'text-[#342A30] hover:text-[#B87583]'}`}
        >
          Servicios y Catálogo
        </button>
        <button 
          onClick={() => navigate('admin')} 
          className="text-xs font-semibold text-[#879681] hover:text-[#70415D] transition-colors flex items-center gap-1.5"
        >
          <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          Panel Admin
        </button>
        <Button variant="primary" onClick={() => navigate('booking')} className="font-bold">
          Reservar mi cita
        </Button>
      </nav>
      <div className="flex md:hidden items-center gap-2">
        <Button variant="ghost" onClick={() => navigate('admin')} className="!px-2.5 !py-1.5 text-xs font-bold">
          Admin
        </Button>
        <Button variant="primary" onClick={() => navigate('booking')} className="!px-3 !py-1.5 text-xs font-bold">
          Reservar
        </Button>
      </div>
    </div>
  </header>
);

interface HomeViewProps {
  navigate: (route: string) => void;
  services: ServiceItem[];
  customHeroBg: string;
  onSelectServiceFromHome: (service: ServiceItem) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ navigate, services, customHeroBg, onSelectServiceFromHome }) => {
  const safeServices = Array.isArray(services) ? services : [];

  return (
    <div className="flex flex-col w-full">
      <section 
        className="relative w-full py-20 md:py-28 px-4 overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${customHeroBg || DEFAULT_HERO_BG})` }}
      >
        <div className="absolute inset-0 bg-white/15 backdrop-blur-[0.5px]"></div>
        
        <div className="max-w-3xl mx-auto text-center relative z-10 bg-[#FFF8F5]/80 backdrop-blur-md p-8 md:p-12 rounded-3xl border-2 border-[#B87583]/40 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#B87583]/40 text-[#70415D] text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
            <Flower2 size={15} className="text-[#B87583]" /> Warmi T&apos;ika | Beauty Studio <Flower2 size={15} className="text-[#879681]" />
          </div>

          <div className="flex justify-center mb-6">
            <Logo className="h-24 md:h-32" />
          </div>

          <h1 className="text-3xl md:text-5xl font-serif text-[#342A30] mb-5 leading-tight">
            Un momento para ti,<br/> 
            <span className="text-[#70415D] italic">un estilo que te representa.</span>
          </h1>

          <p className="text-base md:text-lg text-[#342A30]/90 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
            Sumérgete en un ambiente exclusivo de cuidado y calma. En <strong>Warmi T&apos;ika | Beauty Studio</strong> cuidamos cada detalle para realzar tu belleza natural.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" className="w-full sm:w-auto !px-8 !py-4 text-base font-bold" onClick={() => navigate('booking')}>
              Reservar mi cita <ChevronRight size={20} className="ml-2"/>
            </Button>
            <a 
              href="https://wa.me/51987654321?text=Hola%20Warmi%20T'ika%20Beauty%20Studio,%20deseo%20informaci%C3%B3n%20para%20una%20cita" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full sm:w-auto"
            >
              <Button variant="whatsapp" className="w-full !px-8 !py-4 text-base font-bold">
                <MessageCircle size={20} className="mr-2"/> Consultar por WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section 
        className="py-16 px-4 relative bg-cover bg-fixed bg-center"
        style={{ backgroundImage: `url(${customHeroBg || DEFAULT_HERO_BG})` }}
      >
        <div className="absolute inset-0 bg-[#FFF8F5]/92 backdrop-blur-sm"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#879681] block mb-2">Experiencias de Cuidado</span>
            <h2 className="text-3xl md:text-4xl font-serif text-[#70415D]">Nuestros Tratamientos Destacados</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-[#C38296] to-[#879681] mx-auto mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {safeServices.slice(0, 4).map((service) => (
              <div 
                key={service.id} 
                onClick={() => onSelectServiceFromHome(service)}
                className="group rounded-2xl overflow-hidden border border-[#C38296]/30 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col bg-white/95"
              >
                <div className="h-52 overflow-hidden relative">
                  <img 
                    src={service.image} 
                    alt={service.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#70415D] border border-[#C38296]/30 shadow-sm">
                    {service.category}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-serif text-lg text-[#342A30] mb-2 group-hover:text-[#B87583] transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{service.description}</p>
                  <div className="mt-auto flex justify-between items-center text-sm pt-4 border-t border-[#FFF8F5]">
                    <span className="text-[#879681] font-medium flex items-center bg-[#FFF8F5] px-2.5 py-1 rounded-full text-xs">
                      <Clock size={13} className="mr-1"/> {service.duration}
                    </span>
                    <span className="font-bold text-[#70415D]">{service.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" onClick={() => navigate('catalog')} className="font-bold !px-8">
              Ver todo el catálogo de servicios
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

interface CatalogViewProps {
  navigate: (route: string) => void;
  services: ServiceItem[];
  initialSelectedService: ServiceItem | null;
  clearInitialSelected: () => void;
}

const CatalogView: React.FC<CatalogViewProps> = ({ navigate, services, initialSelectedService, clearInitialSelected }) => {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(initialSelectedService || null);

  useEffect(() => {
    if (initialSelectedService) {
      setSelectedService(initialSelectedService);
    }
  }, [initialSelectedService]);

  const categories = ['Todos', ...SERVICE_CATEGORIES];
  const safeServices = Array.isArray(services) ? services : [];

  const filteredServices = activeCategory === 'Todos'
    ? safeServices
    : safeServices.filter((s) => s.category === activeCategory);

  const handleCloseModal = () => {
    setSelectedService(null);
    clearInitialSelected();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-[#C38296]/30 pb-5 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#879681]">Warmi T&apos;ika | Beauty Studio</span>
          <h1 className="text-3xl md:text-4xl font-serif text-[#70415D] mt-1">Nuestros Servicios</h1>
          <p className="text-gray-600 text-sm mt-1">Toca cualquier tratamiento para ver qué incluye y reservarlo.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('booking')} className="font-bold">
          Reservar Ahora
        </Button>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${
              cat === activeCategory
                ? 'bg-[#70415D] text-white border-[#70415D] shadow-md scale-105'
                : 'bg-white/90 text-[#342A30] border-[#C38296]/40 hover:border-[#B87583] hover:text-[#B87583]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            onClick={() => setSelectedService(service)}
            className="flex flex-col bg-white/95 rounded-2xl overflow-hidden border border-[#C38296]/30 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <div className="h-56 overflow-hidden relative">
              <img 
                src={service.image} 
                alt={service.name} 
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#70415D] text-xs font-bold px-3 py-1 rounded-full">
                {service.category}
              </span>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-serif text-xl text-[#342A30] mb-2 group-hover:text-[#70415D] transition-colors">
                {service.name}
              </h3>
              <p className="text-gray-600 text-sm flex-1 mb-5 line-clamp-2">
                {service.description}
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-[#FFF8F5]">
                <span className="font-bold text-[#70415D] text-lg">{service.price}</span>
                <span className="text-xs font-semibold text-[#879681] flex items-center bg-[#FFF8F5] px-3 py-1 rounded-full">
                  <Clock size={14} className="mr-1"/> {service.duration}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={!!selectedService} onClose={handleCloseModal} title="Detalle del Tratamiento">
        {selectedService && (
          <div className="flex flex-col gap-4">
            <img 
              src={selectedService.image} 
              alt={selectedService.name} 
              className="w-full h-56 object-cover rounded-2xl shadow-sm border border-[#C38296]/30" 
            />
            <div className="pt-2">
              <span className="inline-block bg-[#FFF8F5] text-[#B87583] border border-[#C38296]/40 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
                {selectedService.category}
              </span>
              <h3 className="font-serif text-2xl text-[#342A30] mb-3">{selectedService.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 bg-[#FFF8F5] p-4 rounded-2xl border border-[#C38296]/20">
                {selectedService.description}
              </p>
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl mb-6 border border-[#C38296]/30 shadow-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Valor Referencial</p>
                  <p className="font-bold text-[#70415D] text-2xl">{selectedService.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Duración</p>
                  <p className="font-bold text-[#879681] flex items-center justify-end">
                    <Clock size={16} className="mr-1 text-[#B87583]"/> {selectedService.duration}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="primary" 
                  className="w-full py-3.5 text-base font-bold" 
                  onClick={() => {
                    handleCloseModal();
                    navigate('booking');
                  }}
                >
                  Reservar este servicio
                </Button>
                <a 
                  href={`https://wa.me/51987654321?text=${encodeURIComponent(`Hola Warmi T'ika | Beauty Studio, deseo consultar por el servicio: ${selectedService.name}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="whatsapp" className="w-full py-3 text-sm font-bold">
                    <MessageCircle size={18} className="mr-2" /> Consultar por WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

interface BookingFlowProps {
  navigate: (route: string) => void;
  services: ServiceItem[];
  staffList: StaffItem[];
}

const BookingFlow: React.FC<BookingFlowProps> = ({ navigate, services, staffList }) => {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>('Cualquier profesional disponible');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const safeServices = Array.isArray(services) ? services : [];
  const safeStaff = Array.isArray(staffList) ? staffList : [];

  // Filtra las profesionales que atienden la categoría del servicio elegido (o muestra todas si no hay filtro específico)
  const matchingStaff = useMemo(() => {
    if (!selectedService) return safeStaff;
    const filtered = safeStaff.filter(
      (st) => Array.isArray(st.roles) && st.roles.includes(selectedService.category)
    );
    return filtered.length > 0 ? filtered : safeStaff;
  }, [safeStaff, selectedService]);

  if (showSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-white/95 p-8 rounded-3xl shadow-xl border border-[#C38296]/40">
          <div className="w-20 h-20 bg-[#879681]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-[#2e7d5b]" />
          </div>
          <h2 className="text-3xl font-serif text-[#70415D] mb-3">¡Solicitud Registrada!</h2>
          <p className="text-gray-600 text-sm mb-6">
            Gracias, <strong>{customerName || 'Hermosa'}</strong>. Hemos reservado tu espacio en <strong>Warmi T&apos;ika | Beauty Studio</strong> para <strong>{selectedService?.name}</strong> con <strong>{selectedStaff}</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/51987654321?text=${encodeURIComponent(`Hola Warmi T'ika | Beauty Studio 🌸 Soy ${customerName || 'clienta'}, acabo de reservar ${selectedService?.name || 'mi cita'} con ${selectedStaff}${selectedDate ? ` para el ${selectedDate}` : ''} a las ${selectedTime}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" className="w-full font-bold">
                <MessageCircle size={18} className="mr-2"/> Enviar confirmación por WhatsApp
              </Button>
            </a>
            <Button variant="outline" onClick={() => navigate('home')} className="w-full font-bold">
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 w-full">
      <div className="bg-white/95 rounded-3xl shadow-xl p-6 md:p-10 border border-[#C38296]/30">
        <div className="mb-8 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-[#FFF8F5] -z-10"></div>
          {[1, 2, 3, 4].map(num => (
            <div 
              key={num} 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step >= num ? 'bg-[#70415D] text-white shadow-md' : 'bg-[#FFF8F5] border border-[#C38296]/40 text-gray-400'
              }`}
            >
              {step > num ? <Check size={16} /> : num}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-serif text-[#70415D] mb-6">1. Elige tu experiencia en Warmi T&apos;ika | Beauty Studio</h2>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {safeServices.map((service) => (
                <div 
                  key={service.id} 
                  onClick={() => {
                    setSelectedService(service);
                    setSelectedStaff('Cualquier profesional disponible');
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                    selectedService?.id === service.id 
                      ? 'border-[#B87583] bg-[#FFF8F5] shadow-sm' 
                      : 'border-gray-100 hover:border-[#C38296]/60'
                  }`}
                >
                  <img src={service.image} className="w-16 h-16 rounded-xl object-cover" alt={service.name} />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B87583] bg-[#FFF8F5] px-2 py-0.5 rounded-full border border-[#C38296]/30">
                      {service.category}
                    </span>
                    <h4 className="font-bold text-[#342A30] mt-0.5">{service.name}</h4>
                    <p className="text-xs text-[#879681] font-medium flex items-center mt-1">
                      <Clock size={12} className="mr-1"/> {service.duration}
                    </p>
                  </div>
                  <div className="font-bold text-[#70415D]">{service.price}</div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedService} className={!selectedService ? 'opacity-50' : ''}>
                Continuar <ChevronRight size={18} className="ml-1"/>
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-serif text-[#70415D] mb-6">2. Fecha, Hora y Especialista</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#342A30] mb-2">
                  Especialista {selectedService ? `(${selectedService.category})` : ''}
                </label>
                <select 
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full border border-[#C38296]/50 rounded-xl p-3 bg-[#FFF8F5]/50 outline-none font-medium text-sm"
                >
                  <option value="Cualquier profesional disponible">✨ Cualquier profesional disponible</option>
                  {matchingStaff.map(s => (
                    <option key={s.id} value={`${s.name} (${s.specialty})`}>
                      👩‍‍🎨 {s.name} — {s.specialty}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Puedes elegir a tu especialista favorita o dejar que te asignemos una disponible.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#342A30] mb-2">Fecha deseada</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-[#C38296]/50 rounded-xl p-3 bg-[#FFF8F5]/50 outline-none text-sm" 
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-bold text-[#342A30] mb-3">Horarios Disponibles</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {['09:30', '10:00', '11:30', '15:00', '16:30', '18:00'].map(time => (
                  <button 
                    key={time} 
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`py-2.5 border rounded-xl text-sm font-bold transition-colors ${
                      selectedTime === time 
                        ? 'bg-[#70415D] text-white border-[#70415D]' 
                        : 'border-[#C38296]/40 hover:bg-[#FFF8F5]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={18} className="mr-1"/> Volver</Button>
              <Button onClick={() => setStep(3)}>Continuar <ChevronRight size={18} className="ml-1"/></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-serif text-[#70415D] mb-6">3. Tus Datos de Contacto</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#342A30] mb-1.5">Nombre y Apellido *</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ej. María Fernanda" 
                  className="w-full border border-[#C38296]/50 rounded-xl p-3 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#342A30] mb-1.5">Teléfono WhatsApp *</label>
                <input 
                  type="tel" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="999 999 999" 
                  className="w-full border border-[#C38296]/50 rounded-xl p-3 outline-none" 
                />
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}><ChevronLeft size={18} className="mr-1"/> Volver</Button>
              <Button onClick={() => setStep(4)}>Revisar Cita <ChevronRight size={18} className="ml-1"/></Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <h2 className="text-2xl font-serif text-[#70415D] mb-2">Confirmar tu Reserva en Warmi T&apos;ika | Beauty Studio</h2>
            <p className="text-gray-500 text-sm mb-6">Verifica que los datos estén correctos.</p>
            <div className="bg-[#FFF8F5] p-6 rounded-2xl text-left max-w-md mx-auto mb-8 border border-[#C38296]/40 space-y-2">
              <p className="text-sm"><strong>Servicio:</strong> {selectedService?.name || 'Tratamiento'}</p>
              <p className="text-sm"><strong>Especialista:</strong> {selectedStaff}</p>
              {selectedDate && <p className="text-sm"><strong>Fecha:</strong> {selectedDate}</p>}
              <p className="text-sm"><strong>Horario:</strong> {selectedTime} hrs</p>
              <p className="text-sm"><strong>Clienta:</strong> {customerName || 'Invitada'}</p>
              <div className="mt-4 pt-3 border-t border-[#C38296]/30 flex justify-between items-center font-bold text-lg text-[#70415D]">
                <span>Valor Estimado:</span>
                <span>{selectedService?.price || 'S/ 0'}</span>
              </div>
            </div>
            <div className="flex justify-between max-w-md mx-auto">
              <Button variant="ghost" onClick={() => setStep(3)}>Modificar</Button>
              <Button variant="primary" onClick={() => setShowSuccess(true)}>Confirmar Cita</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin, onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] flex flex-col justify-center items-center p-4">
      <div className="absolute top-4 left-4">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={18} className="mr-1"/> Volver a Warmi T&apos;ika</Button>
      </div>
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-[#C38296]/30 text-center">
        <div className="w-14 h-14 bg-[#70415D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={26} className="text-[#70415D]" />
        </div>
        <Logo className="h-14 mx-auto mb-2 justify-center" />
        <h2 className="text-lg font-serif text-[#70415D] mb-6">Acceso Administrativo — Warmi T&apos;ika | Beauty Studio (Clave: admin)</h2>
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Escribe: admin" 
              className={`w-full border rounded-xl p-3 outline-none ${error ? 'border-red-500 bg-red-50' : 'border-[#C38296]/50'}`}
            />
            {error && (
              <p className="text-red-600 text-xs mt-2 font-bold flex items-center">
                <AlertCircle size={14} className="mr-1"/> Clave incorrecta. Usa &quot;admin&quot;.
              </p>
            )}
          </div>
          <Button type="submit" variant="primary" className="w-full py-3 font-bold">
            Entrar al Panel de Control
          </Button>
        </form>
      </div>
    </div>
  );
};

interface InvitationsTabProps {
  customCardBg: string;
  setCustomCardBg: (val: string) => void;
  customHeroBg: string;
  setCustomHeroBg: (val: string) => void;
  customers: CustomerItem[];
  onSaveCustomer: (cust: CustomerItem) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onSaveSettings: (heroBg: string, cardBg: string) => Promise<void>;
  isCloudSynced: boolean;
}

const InvitationsTab: React.FC<InvitationsTabProps> = ({ 
  customCardBg, setCustomCardBg, 
  customHeroBg, setCustomHeroBg,
  customers, onSaveCustomer, onDeleteCustomer,
  onSaveSettings, isCloudSynced
}) => {
  // ORDENAMIENTO AUTOMÁTICO: Las clientas con MÁS DÍAS SIN VISITA van ARRIBA DEL TODO
  const sortedCustomers = useMemo(() => {
    const baseList = Array.isArray(customers) && customers.length > 0 ? customers : mockInactiveCustomers;
    return [...baseList].sort((a, b) => getEffectiveDays(b) - getEffectiveDays(a));
  }, [customers]);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(ANTI_SPAM_TEMPLATES[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(sortedCustomers[0]?.id || 'c1');
  const [benefit, setBenefit] = useState("20% de descuento");
  const [code, setCode] = useState("WARMI20");
  const [cardNotice, setCardNotice] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [copiedTextNotice, setCopiedTextNotice] = useState(false);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    service: 'Balayage Iluminado',
    lastVisit: '01/09/2026',
    days: 30
  });

  const selectedCustomer = sortedCustomers.find((c) => c.id === selectedCustomerId) || sortedCustomers[0];

  const customerFirstName = (selectedCustomer && selectedCustomer.name) 
    ? selectedCustomer.name.trim().split(' ')[0] 
    : 'Hermosa';

  const buildMessageForCustomer = (customerObj: CustomerItem | undefined, templateObj: TemplateItem | undefined) => {
    const targetCust = customerObj || selectedCustomer;
    const targetTpl = templateObj || selectedTemplate || ANTI_SPAM_TEMPLATES[0];
    const firstName = targetCust?.name ? targetCust.name.trim().split(' ')[0] : 'Hermosa';
    const effectiveDays = getEffectiveDays(targetCust);
    return (targetTpl.content || '')
      .replace(/\{\{nombre\}\}/g, firstName)
      .replace(/\{\{dias\}\}/g, String(effectiveDays))
      .replace(/\{\{servicio\}\}/g, targetCust?.service || 'nuestro servicio')
      .replace(/\{\{beneficio\}\}/g, benefit || '20% de descuento')
      .replace(/\{\{codigo\}\}/g, code || 'WARMI20')
      .replace(/\{\{fecha_vencimiento\}\}/g, '30/10/2026');
  };

  const getParsedText = () => buildMessageForCustomer(selectedCustomer, selectedTemplate);

  const pickAnotherRandomTemplate = (currentId?: string): TemplateItem => {
    const pool = ANTI_SPAM_TEMPLATES.filter(t => t.id !== (currentId || selectedTemplate?.id));
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex] || ANTI_SPAM_TEMPLATES[0];
    setSelectedTemplate(chosen);
    return chosen;
  };

  const handleCopyTextOnly = async (textToCopy?: string) => {
    const txt = textToCopy || getParsedText();
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedTextNotice(true);
      setTimeout(() => setCopiedTextNotice(false), 3000);
    } catch (e) {
      console.error("No se pudo copiar el texto:", e);
    }
  };

  const customerPhone = (selectedCustomer?.phone || '987654321').replace(/\D/g, '');
  const waLink = `https://wa.me/51${customerPhone}?text=${encodeURIComponent(getParsedText())}`;

  const handleDownloadCard = async (custOverride: CustomerItem | null = null) => {
    const target = custOverride || selectedCustomer;
    const firstName = target?.name ? target.name.trim().split(' ')[0] : 'Hermosa';
    const effectiveDays = getEffectiveDays(target);
    setIsGeneratingImg(true);
    try {
      const blob = await generateInvitationCardBlob({
        customerFirstName: firstName,
        benefit,
        code,
        days: effectiveDays,
        service: target?.service || 'Beauty Studio',
        bgUrl: customCardBg
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invitacion_Warmi_Tika_${firstName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setCardNotice(`✅ Tarjeta PNG de ${firstName} descargada. Adjúntala en el chat de WhatsApp.`);
      }
    } catch (e) {
      console.error("Error generando tarjeta:", e);
    }
    setIsGeneratingImg(false);
  };

  const handleSendWhatsAppWithImage = async (custOverride: CustomerItem | null = null, rotateRandom = true) => {
    const target = custOverride || selectedCustomer;
    if (!target) return;
    setSelectedCustomerId(target.id);

    const chosenTemplate = rotateRandom
      ? pickAnotherRandomTemplate(selectedTemplate?.id)
      : selectedTemplate;

    const firstName = target.name ? target.name.trim().split(' ')[0] : 'Hermosa';
    const effectiveDays = getEffectiveDays(target);
    const messageText = buildMessageForCustomer(target, chosenTemplate);
    const cleanPhone = (target.phone || '987654321').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const directWaUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;

    window.open(directWaUrl, '_blank', 'noopener,noreferrer');

    setIsGeneratingImg(true);
    try {
      const blob = await generateInvitationCardBlob({
        customerFirstName: firstName,
        benefit,
        code,
        days: effectiveDays,
        service: target.service || 'Beauty Studio',
        bgUrl: customCardBg
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invitacion_Warmi_Tika_${firstName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        let copiedImg = false;
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            copiedImg = true;
          } catch {
            copiedImg = false;
          }
        }

        setCardNotice(
          copiedImg
            ? `✅ ¡Listo! Se abrió el WhatsApp de ${firstName} con su MENSAJE RANDOM + DESCUENTO escrito, y su TARJETA ya está copiada. En WhatsApp solo presiona Ctrl+V (Pegar) y dale Enviar.`
            : `✅ ¡Listo! Se abrió el WhatsApp de ${firstName} con su MENSAJE RANDOM + DESCUENTO escrito, y su TARJETA PNG se descargó para adjuntarla.`
        );
      }
    } catch (err) {
      console.error("Error preparando imagen para WhatsApp:", err);
    }
    setIsGeneratingImg(false);
  };

  const handleOpenCustomerModal = (cust: CustomerItem | null = null) => {
    if (cust) {
      setEditingCustomer(cust.id);
      setCustomerForm({
        name: cust.name || '',
        phone: cust.phone || '',
        service: cust.service || 'Corte Boutique',
        lastVisit: cust.lastVisit || '01/09/2026',
        days: getEffectiveDays(cust)
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: '',
        phone: '',
        service: 'Balayage Iluminado',
        lastVisit: new Date().toLocaleDateString('es-PE'),
        days: 30
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = editingCustomer || `c${Date.now()}`;
    const newCustomerObj: CustomerItem = {
      id: newId,
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      service: customerForm.service.trim(),
      lastVisit: customerForm.lastVisit.trim(),
      days: Number(customerForm.days) || 30
    };
    await onSaveCustomer(newCustomerObj);
    setSelectedCustomerId(newId);
    setIsCustomerModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-2xl border border-[#C38296]/30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full ${isCloudSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-xs font-bold text-[#342A30]">
            {isCloudSynced 
              ? "Warmi T'ika | Beauty Studio Cloud (Firebase): Tus clientas, personal, fondos y servicios se guardan automáticamente." 
              : "Conectando con Firebase..."}
          </span>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => handleOpenCustomerModal()} 
          className="!py-1.5 !px-4 text-xs font-bold"
        >
          <Plus size={15} className="mr-1"/> Agregar Nueva Clienta
        </Button>
      </div>

      {/* TABLA PRIORIZADA ARRIBA: LAS CLIENTAS CON MÁS DÍAS SIN VISITA VAN PRIMERO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-[#B87583]/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-[#FFF8F5] text-[#70415D] border border-[#C38296]/40 px-3 py-1 rounded-full mb-2">
              <ArrowUpDown size={13} className="text-[#B87583]" /> Ordenado Automáticamente por Mayor Ausencia
            </span>
            <h3 className="font-serif text-xl text-[#70415D] flex items-center gap-2">
              <Users size={20} className="text-[#B87583]" /> Clientas con Más Tiempo sin Visita (Van Arriba)
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Las clientas que tienen más días sin venir aparecen arriba del todo. Al pulsar el botón verde se genera un <strong>mensaje random distinto con su descuento</strong> + su <strong>tarjeta de foto personalizada</strong>.
            </p>
          </div>
          <Button variant="primary" onClick={() => handleOpenCustomerModal()} className="!py-2 !px-4 text-xs font-bold shrink-0">
            <Plus size={16} className="mr-1"/> Añadir Clienta
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FFF8F5] text-[#70415D] text-xs uppercase font-bold border-b border-[#C38296]/20">
                <th className="p-3.5">Prioridad / Clienta</th>
                <th className="p-3.5">WhatsApp</th>
                <th className="p-3.5">Último Servicio</th>
                <th className="p-3.5">Tiempo sin Visita</th>
                <th className="p-3.5 text-right">Enviar Mensaje Random + Foto + Descuento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {sortedCustomers.map((cust, idx) => {
                const isSelected = cust.id === selectedCustomer?.id;
                const effectiveDays = getEffectiveDays(cust);
                const isUrgent = effectiveDays >= 30;
                return (
                  <tr 
                    key={cust.id} 
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      pickAnotherRandomTemplate(selectedTemplate?.id);
                    }}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#FFF8F5] font-medium' : 'hover:bg-gray-50'}`}
                  >
                    <td className="p-3.5 flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        isUrgent ? 'bg-[#70415D] text-white shadow-sm' : 'bg-gray-200 text-gray-700'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-[#342A30] block">{cust.name}</span>
                        <span className="text-[11px] text-gray-400">Última vez: {cust.lastVisit}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 font-mono text-xs">+51 {cust.phone}</td>
                    <td className="p-3.5 text-gray-600">{cust.service}</td>
                    <td className="p-3.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        isUrgent 
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        🔥 Hace {effectiveDays} días
                      </span>
                    </td>
                    <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppWithImage(cust, true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[#2e7d5b] hover:bg-[#246649] text-white shadow-sm transition-all cursor-pointer"
                          title="Rota a un mensaje random con descuento, abre WhatsApp con el texto listo y copia/descarga la foto"
                        >
                          <MessageCircle size={14} /> Enviar Mensaje Random + Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCard(cust)}
                          className="p-2 text-[#70415D] hover:bg-[#FFF8F5] rounded-lg border border-[#C38296]/40 cursor-pointer"
                          title="Descargar tarjeta PNG de esta clienta"
                        >
                          <Camera size={15} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenCustomerModal(cust)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar clienta"
                        >
                          <Edit size={16}/>
                        </button>
                        {sortedCustomers.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => onDeleteCustomer(cust.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Eliminar clienta"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL GENERADOR Y VISTA PREVIA DE LA TARJETA Y EL MENSAJE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-serif text-xl text-[#70415D] flex items-center gap-2">
              <Settings size={18} className="text-[#B87583]"/> Configurar Invitación y Descuento
            </h3>
          </div>

          <div className="bg-[#FFF8F5] p-4 rounded-xl border border-[#C38296]/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase text-[#70415D] flex items-center gap-1">
                <Users size={15}/> 1. Clienta Seleccionada (Ordenadas por días de ausencia)
              </label>
              <button 
                type="button"
                onClick={() => handleOpenCustomerModal()} 
                className="text-xs font-bold text-white bg-[#70415D] hover:bg-[#5a334a] px-3 py-1 rounded-full flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={13}/> + Agregar Clienta
              </button>
            </div>
            <div className="flex gap-2">
              <select 
                className="flex-1 border border-[#C38296]/50 bg-white rounded-lg p-2.5 text-sm outline-none"
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  pickAnotherRandomTemplate(selectedTemplate?.id);
                }}
              >
                {sortedCustomers.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    #{i + 1} - {c.name} — {getEffectiveDays(c)} días sin visita ({c.service})
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => handleOpenCustomerModal(selectedCustomer)}
                  title="Editar datos de esta clienta"
                  className="p-2.5 bg-white border border-[#C38296]/50 rounded-lg text-[#70415D] hover:bg-[#FFF8F5] cursor-pointer"
                >
                  <Edit size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase text-gray-600">
                2. Mensaje Anti-Spam (20 Plantillas con Descuento y Días)
              </label>
              <button
                type="button"
                onClick={() => pickAnotherRandomTemplate(selectedTemplate?.id)}
                className="text-xs font-bold text-white bg-[#B87583] hover:bg-[#9f5f6d] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw size={13} /> 🎲 Cambiar Mensaje Random
              </button>
            </div>
            <select 
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none"
              value={selectedTemplate?.id || 't1'}
              onChange={(e) => {
                const found = ANTI_SPAM_TEMPLATES.find(t => t.id === e.target.value);
                if (found) setSelectedTemplate(found);
              }}
            >
              {ANTI_SPAM_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Beneficio / Descuento</label>
              <input 
                type="text" 
                value={benefit} 
                onChange={e => setBenefit(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">Código Único</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5 flex items-center gap-1">
              <Camera size={15}/> Fondo Cuadrado (1:1) de esta Tarjeta (URL IA)
            </label>
            <input 
              type="text" 
              value={customCardBg} 
              onChange={e => {
                setCustomCardBg(e.target.value);
                onSaveSettings(customHeroBg, e.target.value);
              }} 
              placeholder="Pega aquí la URL de tu imagen cuadrada 1:1 para la tarjeta..."
              className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none" 
            />
          </div>

          <div className="pt-2 space-y-2.5">
            <Button 
              variant="whatsapp" 
              disabled={isGeneratingImg}
              onClick={() => handleSendWhatsAppWithImage(selectedCustomer, false)}
              className="w-full py-3.5 font-bold text-sm"
            >
              <MessageCircle size={18} className="mr-2"/> 
              {isGeneratingImg 
                ? 'Generando tarjeta HD...' 
                : `Enviar este Mensaje + Foto + Descuento a ${customerFirstName}`}
            </Button>

            <Button 
              variant="primary" 
              disabled={isGeneratingImg}
              onClick={() => handleSendWhatsAppWithImage(selectedCustomer, true)}
              className="w-full py-3 font-bold text-xs"
            >
              <Sparkles size={16} className="mr-1.5"/> 🎲 Rotar Nuevo Mensaje Random + Enviar Foto a {customerFirstName}
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                disabled={isGeneratingImg}
                onClick={() => handleDownloadCard(selectedCustomer)}
                className="w-full py-2.5 text-xs font-bold"
              >
                <Camera size={15} className="mr-1.5"/> Solo Descargar Tarjeta PNG
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => handleCopyTextOnly()}
                className="w-full py-2.5 text-xs font-bold border border-gray-200"
              >
                <Copy size={14} className="mr-1.5"/> {copiedTextNotice ? '¡Texto Copiado!' : 'Copiar Texto del Mensaje'}
              </Button>
            </div>

            {cardNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold leading-relaxed">
                {cardNotice}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#E7F6EC] p-5 rounded-2xl border border-[#C2E7CE] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-[#1F8D46] uppercase flex items-center">
                <MessageCircle size={13} className="mr-1"/> Vista Previa del Texto WhatsApp ({selectedCustomer?.phone} • {getEffectiveDays(selectedCustomer)} días sin visita)
              </h4>
              <button
                type="button"
                onClick={() => pickAnotherRandomTemplate(selectedTemplate?.id)}
                className="text-[11px] font-bold bg-white text-[#1F8D46] px-2.5 py-1 rounded-full shadow-sm hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} /> Otro Random
              </button>
            </div>
            <p className="text-sm text-[#0F4221] leading-relaxed font-medium bg-white/70 p-3.5 rounded-xl border border-[#C2E7CE]">
              {getParsedText()}
            </p>
            <div className="mt-2.5 flex justify-between items-center text-[11px] text-[#1F8D46]">
              <span>✨ Incluye: Nombre + Días sin visita + Servicio + Descuento + Código</span>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                Abrir solo texto en WhatsApp ➔
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Arte Exportable Warmi T&apos;ika (1080 × 1080 HD • Sin deformación)
              </span>
              <button
                type="button"
                onClick={() => handleDownloadCard(selectedCustomer)}
                className="text-xs font-bold text-[#70415D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Camera size={13} /> Descargar PNG
              </button>
            </div>
            <div 
              className="w-full max-w-[330px] aspect-square rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center p-5 bg-cover bg-center"
              style={{ backgroundImage: `url(${customCardBg || DEFAULT_CARD_BG})` }}
            >
              <div className="relative z-10 w-full h-full bg-[#FFF8F5]/88 backdrop-blur-[2px] rounded-xl border-2 border-[#B87583]/60 p-5 flex flex-col items-center justify-between shadow-inner">
                <Logo className="h-14" />
                <div className="my-auto">
                  <p className="text-[10px] text-[#879681] uppercase tracking-widest font-bold mb-1">
                    Un regalo especial para ti
                  </p>
                  <h4 className="text-3xl font-serif text-[#70415D] mb-1 capitalize">
                    {customerFirstName}
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-3">
                    Te extrañamos hace {getEffectiveDays(selectedCustomer)} días
                  </p>
                  <div className="bg-gradient-to-r from-[#70415D] to-[#B87583] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md">
                    {benefit || '20% de descuento'}
                  </div>
                </div>
                <div className="pt-2 border-t border-[#C38296]/40 w-full">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Código de reserva</p>
                  <p className="text-base font-mono font-bold text-[#342A30]">{code || 'WARMI20'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#FFF8F5] p-6 rounded-2xl border border-[#C38296]/40 shadow-sm">
        <h3 className="font-serif text-xl text-[#70415D] mb-2 flex items-center gap-2">
          <Flower2 size={20} className="text-[#B87583]" /> Fondo Horizontal (16:9) de la Página Web — Warmi T&apos;ika | Beauty Studio
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          Este es el fondo horizontal de la portada principal de la web (independiente del fondo cuadrado de la tarjeta de descuento):
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            value={customHeroBg} 
            onChange={e => {
              setCustomHeroBg(e.target.value);
              onSaveSettings(e.target.value, customCardBg);
            }}
            placeholder="Pega aquí la URL de tu fondo horizontal para la web..."
            className="flex-1 border border-[#C38296] bg-white rounded-xl p-2.5 text-sm outline-none"
          />
          <Button 
            variant="outline" 
            onClick={() => {
              setCustomHeroBg(DEFAULT_HERO_BG);
              onSaveSettings(DEFAULT_HERO_BG, customCardBg);
            }}
            className="text-xs font-bold whitespace-nowrap"
          >
            Restaurar Fondo Oficial
          </Button>
        </div>
      </div>

      <Modal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
        title={editingCustomer ? "Editar Datos de Clienta" : "Registrar Nueva Clienta en Warmi T'ika"}
      >
        <form onSubmit={handleCustomerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Nombre y Apellido *</label>
            <input 
              required 
              type="text"
              placeholder="Ej. Lucía Fernández"
              value={customerForm.name} 
              onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
              className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Número de WhatsApp (sin +51) *</label>
            <input 
              required 
              type="tel"
              placeholder="Ej. 987654321"
              value={customerForm.phone} 
              onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} 
              className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Último Servicio Realizado</label>
            <input 
              required 
              type="text"
              placeholder="Ej. Balayage Iluminado"
              value={customerForm.service} 
              onChange={e => setCustomerForm({...customerForm, service: e.target.value})} 
              className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Fecha Última Visita</label>
              <input 
                type="text"
                placeholder="Ej. 25/08/2026"
                value={customerForm.lastVisit} 
                onChange={e => setCustomerForm({...customerForm, lastVisit: e.target.value})} 
                className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Días sin asistir</label>
              <input 
                type="number"
                min="0"
                value={customerForm.days} 
                onChange={e => setCustomerForm({...customerForm, days: Number(e.target.value)})} 
                className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsCustomerModalOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" className="font-bold">
              {editingCustomer ? "Guardar Cambios" : "Guardar Clienta"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

interface AdminDashboardProps {
  onLogout: () => void;
  services: ServiceItem[];
  onSaveService: (srv: ServiceItem) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
  customers: CustomerItem[];
  onSaveCustomer: (cust: CustomerItem) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  staffList: StaffItem[];
  onSaveStaff: (st: StaffItem) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  customHeroBg: string;
  setCustomHeroBg: (val: string) => void;
  customCardBg: string;
  setCustomCardBg: (val: string) => void;
  onSaveSettings: (heroBg: string, cardBg: string) => Promise<void>;
  isCloudSynced: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onLogout, services, onSaveService, onDeleteService,
  customers, onSaveCustomer, onDeleteCustomer,
  staffList, onSaveStaff, onDeleteStaff,
  customHeroBg, setCustomHeroBg, customCardBg, setCustomCardBg,
  onSaveSettings, isCloudSynced
}) => {
  const [activeTab, setActiveTab] = useState('invitations');

  // Estados para modal de Servicios
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'Cabello', price: '', duration: '', image: '', description: ''
  });

  // Estados para modal de Personal / Empleados
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<{
    name: string;
    specialty: string;
    roles: string[];
  }>({
    name: '',
    specialty: 'Especialista en Cabello y Alisados',
    roles: ['Cabello']
  });

  const safeServices = Array.isArray(services) ? services : [];
  const safeStaff = Array.isArray(staffList) ? staffList : [];

  const handleOpenForm = (service: ServiceItem | null = null) => {
    if (service) {
      setEditingService(service.id);
      setFormData({
        name: service.name || '',
        category: service.category || 'Cabello',
        price: service.price || '',
        duration: service.duration || '',
        image: service.image || '',
        description: service.description || ''
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '', category: 'Cabello', price: 'S/ 50', duration: '60 min',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600',
        description: ''
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingService || `s${Date.now()}`;
    await onSaveService({ ...formData, id });
    setIsServiceModalOpen(false);
  };

  const handleOpenStaffModal = (staffMember: StaffItem | null = null) => {
    if (staffMember) {
      setEditingStaff(staffMember.id);
      setStaffForm({
        name: staffMember.name || '',
        specialty: staffMember.specialty || '',
        roles: Array.isArray(staffMember.roles) && staffMember.roles.length > 0 ? staffMember.roles : ['Cabello']
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: '',
        specialty: 'Estilista Profesional',
        roles: ['Cabello']
      });
    }
    setIsStaffModalOpen(true);
  };

  const toggleStaffRole = (roleName: string) => {
    setStaffForm((prev) => {
      const exists = prev.roles.includes(roleName);
      if (exists && prev.roles.length === 1) return prev; // Al menos 1 categoría activa
      return {
        ...prev,
        roles: exists ? prev.roles.filter((r) => r !== roleName) : [...prev.roles, roleName]
      };
    });
  };

  const handleSaveStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingStaff || `st${Date.now()}`;
    await onSaveStaff({
      id,
      name: staffForm.name.trim(),
      specialty: staffForm.specialty.trim(),
      roles: staffForm.roles
    });
    setIsStaffModalOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#FFF8F5]">
      <aside className="w-full md:w-64 bg-[#342A30] text-white flex flex-col justify-between p-5">
        <div>
          <Logo className="h-12 mb-6" color="white" />
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('invitations')} 
              className={`w-full flex items-center p-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'invitations' ? 'bg-[#70415D] text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <MessageCircle size={18} className="mr-3"/> Invitaciones y Clientas
            </button>
            <button 
              onClick={() => setActiveTab('staff')} 
              className={`w-full flex items-center p-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'staff' ? 'bg-[#70415D] text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <UserCheck size={18} className="mr-3"/> Personal / Empleados
            </button>
            <button 
              onClick={() => setActiveTab('catalog')} 
              className={`w-full flex items-center p-3 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'catalog' ? 'bg-[#70415D] text-white' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              <Scissors size={18} className="mr-3"/> Editar Servicios
            </button>
          </nav>
        </div>
        <button 
          onClick={onLogout} 
          className="mt-6 flex items-center justify-center text-sm font-bold text-gray-300 hover:text-white p-3 bg-white/5 rounded-xl cursor-pointer"
        >
          <LogOut size={18} className="mr-2"/> Salir a la Web
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'invitations' && (
          <InvitationsTab 
            customCardBg={customCardBg}
            setCustomCardBg={setCustomCardBg}
            customHeroBg={customHeroBg}
            setCustomHeroBg={setCustomHeroBg}
            customers={customers}
            onSaveCustomer={onSaveCustomer}
            onDeleteCustomer={onDeleteCustomer}
            onSaveSettings={onSaveSettings}
            isCloudSynced={isCloudSynced}
          />
        )}

        {activeTab === 'staff' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#C38296]/30">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#879681]">
                  Equipo de Trabajo en Tiempo Real
                </span>
                <h2 className="text-2xl font-serif text-[#70415D] mt-1">
                  Personal y Especialistas — Warmi T&apos;ika | Beauty Studio
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Agrega o quita empleadas aquí. Los cambios aparecen automáticamente cuando las clientas reservan su cita en la web.
                </p>
              </div>
              <Button variant="primary" onClick={() => handleOpenStaffModal()} className="font-bold shrink-0">
                <Plus size={18} className="mr-1.5"/> Agregar Personal
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FFF8F5] border-b text-xs text-[#70415D] uppercase font-bold">
                    <th className="p-4">Nombre de la Especialista</th>
                    <th className="p-4">Cargo / Especialidad</th>
                    <th className="p-4">Áreas que Atiende en Reservas</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {safeStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#70415D] to-[#B87583] text-white flex items-center justify-center font-serif font-bold text-base">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'W'}
                          </div>
                          <span className="font-bold text-[#342A30] text-sm">{member.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600 font-medium">
                        {member.specialty}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {(Array.isArray(member.roles) ? member.roles : []).map((role) => (
                            <span 
                              key={role} 
                              className="bg-[#FFF8F5] text-[#70415D] border border-[#C38296]/40 text-xs font-bold px-2.5 py-1 rounded-full"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenStaffModal(member)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          title="Editar personal"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteStaff(member.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Quitar personal del estudio"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {safeStaff.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sm text-gray-500">
                        No hay personal registrado. Haz clic en &quot;Agregar Personal&quot; para añadir a tu equipo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif text-[#70415D]">Catálogo de Servicios — Warmi T&apos;ika | Beauty Studio</h2>
              <Button variant="primary" onClick={() => handleOpenForm()}>
                <Plus size={18} className="mr-1"/> Agregar Servicio
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FFF8F5] border-b text-xs text-[#70415D] uppercase font-bold">
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {safeServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="p-4 flex items-center gap-3">
                        <img src={service.image} alt={service.name} className="w-12 h-12 rounded-lg object-cover"/>
                        <span className="font-bold text-sm">{service.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-[#FFF8F5] text-[#70415D] text-xs font-bold px-3 py-1 rounded-full">
                          {service.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#70415D]">{service.price}</td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleOpenForm(service)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => onDeleteService(service.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL PARA AGREGAR / EDITAR PERSONAL */}
        <Modal 
          isOpen={isStaffModalOpen} 
          onClose={() => setIsStaffModalOpen(false)} 
          title={editingStaff ? "Editar Especialista" : "Agregar Personal a Warmi T'ika"}
        >
          <form onSubmit={handleSaveStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Nombre de la Especialista *</label>
              <input 
                required 
                type="text"
                placeholder="Ej. Valeria o María"
                value={staffForm.name} 
                onChange={e => setStaffForm({...staffForm, name: e.target.value})} 
                className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Especialidad o Cargo *</label>
              <input 
                required 
                type="text"
                placeholder="Ej. Especialista en Alisados, Color y Peinados"
                value={staffForm.specialty} 
                onChange={e => setStaffForm({...staffForm, specialty: e.target.value})} 
                className="w-full border border-[#C38296]/50 rounded-xl p-2.5 text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                ¿Qué categorías de servicio realiza? (Selecciona una o varias)
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => {
                  const active = staffForm.roles.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleStaffRole(cat)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        active 
                          ? 'bg-[#70415D] text-white border-[#70415D] shadow-sm' 
                          : 'bg-[#FFF8F5] text-gray-600 border-[#C38296]/40 hover:border-[#70415D]'
                      }`}
                    >
                      {active && <Check size={13} />} {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsStaffModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" className="font-bold">
                {editingStaff ? "Guardar Cambios" : "Registrar Personal"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL PARA AGREGAR / EDITAR SERVICIO */}
        <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? "Editar Servicio" : "Nuevo Servicio en Warmi T'ika"}>
          <form onSubmit={handleSaveServiceSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Nombre del Servicio</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Categoría</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none">
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Duración</label>
                <input required value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Precio (ej. S/ 60)</label>
              <input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">URL de Imagen</label>
              <input required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full border rounded-xl p-2.5 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Descripción</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full border rounded-xl p-2.5 outline-none"></textarea>
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsServiceModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary">Guardar</Button>
            </div>
          </form>
        </Modal>
      </main>
    </div>
  );
};

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('home');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>(initialMockServices);
  const [customers, setCustomers] = useState<CustomerItem[]>(mockInactiveCustomers);
  const [staffList, setStaffList] = useState<StaffItem[]>(initialMockStaff);
  const [selectedServiceFromHome, setSelectedServiceFromHome] = useState<ServiceItem | null>(null);
  const [customHeroBg, setCustomHeroBg] = useState(DEFAULT_HERO_BG);
  const [customCardBg, setCustomCardBg] = useState(DEFAULT_CARD_BG);
  const [user, setUser] = useState<User | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Asegura que la pestaña del navegador siempre diga únicamente "Warmi T'ika | Beauty Studio"
  useEffect(() => {
    document.title = "Warmi T'ika | Beauty Studio";
  }, [currentRoute]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Error de autenticación en la nube:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const servicesCol = collection(db, 'artifacts', appId, 'public', 'data', 'services');
    const unsubServices = onSnapshot(
      servicesCol,
      (snapshot) => {
        setIsCloudSynced(true);
        if (snapshot.empty) {
          initialMockServices.forEach((srv) => {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', srv.id), srv);
          });
        } else {
          const loadedServices = snapshot.docs.map(d => d.data() as ServiceItem);
          setServices(loadedServices);
        }
      },
      (err) => console.error("Error leyendo servicios:", err)
    );

    const customersCol = collection(db, 'artifacts', appId, 'public', 'data', 'customers');
    const unsubCustomers = onSnapshot(
      customersCol,
      (snapshot) => {
        if (snapshot.empty) {
          mockInactiveCustomers.forEach((cust) => {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', cust.id), cust);
          });
        } else {
          const loadedCustomers = snapshot.docs.map(d => d.data() as CustomerItem);
          setCustomers(loadedCustomers);
        }
      },
      (err) => console.error("Error leyendo clientas:", err)
    );

    const staffCol = collection(db, 'artifacts', appId, 'public', 'data', 'staff');
    const unsubStaff = onSnapshot(
      staffCol,
      (snapshot) => {
        if (snapshot.empty) {
          initialMockStaff.forEach((st) => {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', st.id), st);
          });
        } else {
          const loadedStaff = snapshot.docs.map(d => d.data() as StaffItem);
          setStaffList(loadedStaff);
        }
      },
      (err) => console.error("Error leyendo personal:", err)
    );

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'theme');
    const unsubSettings = onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.heroBg) setCustomHeroBg(data.heroBg);
          if (data.cardBg) setCustomCardBg(data.cardBg);
        } else {
          setDoc(settingsDoc, { heroBg: DEFAULT_HERO_BG, cardBg: DEFAULT_CARD_BG });
        }
      },
      (err) => console.error("Error leyendo configuración:", err)
    );

    return () => {
      unsubServices();
      unsubCustomers();
      unsubStaff();
      unsubSettings();
    };
  }, [user]);

  const handleSaveCustomer = async (customerObj: CustomerItem) => {
    setCustomers(prev => {
      const exists = prev.some(c => c.id === customerObj.id);
      return exists ? prev.map(c => c.id === customerObj.id ? customerObj : c) : [...prev, customerObj];
    });
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', customerObj.id), customerObj);
      } catch (e) {
        console.error("Error guardando clienta:", e);
      }
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'customers', customerId));
      } catch (e) {
        console.error("Error eliminando clienta:", e);
      }
    }
  };

  const handleSaveStaff = async (staffObj: StaffItem) => {
    setStaffList(prev => {
      const exists = prev.some(s => s.id === staffObj.id);
      return exists ? prev.map(s => s.id === staffObj.id ? staffObj : s) : [...prev, staffObj];
    });
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', staffObj.id), staffObj);
      } catch (e) {
        console.error("Error guardando personal:", e);
      }
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff', staffId));
      } catch (e) {
        console.error("Error eliminando personal:", e);
      }
    }
  };

  const handleSaveService = async (serviceObj: ServiceItem) => {
    setServices(prev => {
      const exists = prev.some(s => s.id === serviceObj.id);
      return exists ? prev.map(s => s.id === serviceObj.id ? serviceObj : s) : [...prev, serviceObj];
    });
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', serviceObj.id), serviceObj);
      } catch (e) {
        console.error("Error guardando servicio:", e);
      }
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'services', serviceId));
      } catch (e) {
        console.error("Error eliminando servicio:", e);
      }
    }
  };

  const handleSaveSettings = async (newHeroBg: string, newCardBg: string) => {
    if (user && db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'theme'), {
          heroBg: newHeroBg,
          cardBg: newCardBg
        });
      } catch (e) {
        console.error("Error guardando fondos:", e);
      }
    }
  };

  const handleSelectServiceFromHome = (service: ServiceItem) => {
    setSelectedServiceFromHome(service);
    setCurrentRoute('catalog');
  };

  if (currentRoute === 'admin') {
    if (!isAdminAuth) {
      return <AdminLogin onLogin={() => setIsAdminAuth(true)} onBack={() => setCurrentRoute('home')} />;
    }
    return (
      <AdminDashboard 
        onLogout={() => { setIsAdminAuth(false); setCurrentRoute('home'); }} 
        services={services} 
        onSaveService={handleSaveService}
        onDeleteService={handleDeleteService}
        customers={customers}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        staffList={staffList}
        onSaveStaff={handleSaveStaff}
        onDeleteStaff={handleDeleteStaff}
        customHeroBg={customHeroBg}
        setCustomHeroBg={setCustomHeroBg}
        customCardBg={customCardBg}
        setCustomCardBg={setCustomCardBg}
        onSaveSettings={handleSaveSettings}
        isCloudSynced={isCloudSynced}
      />
    );
  }

  return (
    <div className="font-sans text-[#342A30] flex flex-col min-h-screen bg-[#FFF8F5]">
      <PublicNavbar navigate={setCurrentRoute} activeRoute={currentRoute} isCloudSynced={isCloudSynced} />
      
      <main className="flex-1 flex flex-col w-full">
        {currentRoute === 'home' && (
          <HomeView 
            navigate={setCurrentRoute} 
            services={services} 
            customHeroBg={customHeroBg}
            onSelectServiceFromHome={handleSelectServiceFromHome}
          />
        )}
        {currentRoute === 'catalog' && (
          <CatalogView 
            navigate={setCurrentRoute} 
            services={services} 
            initialSelectedService={selectedServiceFromHome}
            clearInitialSelected={() => setSelectedServiceFromHome(null)}
          />
        )}
        {currentRoute === 'booking' && (
          <BookingFlow navigate={setCurrentRoute} services={services} staffList={staffList} />
        )}
      </main>

      <a 
        href="https://wa.me/51987654321?text=Hola%20Warmi%20T'ika%20%7C%20Beauty%20Studio%20%F0%9F%8C%B7%20Deseo%20agendar%20una%20cita" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="fixed bottom-6 right-6 bg-[#2e7d5b] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 border-2 border-white flex items-center gap-2"
      >
        <MessageCircle size={28} />
      </a>

      <footer className="bg-[#342A30] text-white py-12 border-t-4 border-[#B87583]">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <Logo className="h-16 mb-3" color="white" />
            <p className="text-gray-300 text-sm">
              <strong>Warmi T&apos;ika | Beauty Studio</strong> — Un estudio exclusivo diseñado para resaltar tu belleza natural.
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <p className="flex items-center"><MapPin size={16} className="mr-2 text-[#B87583]"/> Atención previa cita — Perú</p>
            <p className="flex items-center"><MessageCircle size={16} className="mr-2 text-[#879681]"/> WhatsApp: +51 987 654 321</p>
          </div>
          <div className="flex md:justify-end">
            <Button variant="outline" onClick={() => setCurrentRoute('admin')} className="text-xs font-bold">
              Acceso Personal / Admin
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}