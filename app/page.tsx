"use client";

import React, { useState, useEffect, useMemo } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  Sparkles,
  Calendar,
  Clock,
  Users,
  MessageCircle,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Scissors,
  Heart,
  Star,
  Phone,
  Award,
  Copy,
  Check,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  ArrowUpDown,
} from "lucide-react";

// ==========================================
// 1. CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBQs4J79dkfA3BtALwF4M8goJyZqarJh08",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "warmi-tika-studio.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "warmi-tika-studio",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "warmi-tika-studio.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "558257027429",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:558257027429:web:af8790d76470fe7318498c",
};

const appId = process.env.NEXT_PUBLIC_APP_ID || "warmi-tika-prod";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. INTERFACES Y TIPOS
// ==========================================
interface Client {
  id: string;
  name: string;
  phone: string;
  lastVisit: string; // YYYY-MM-DD
  lastService: string;
  notes: string;
  totalVisits: number;
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
}

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  status: "pendiente" | "confirmada" | "completada";
}

// ==========================================
// 3. DATOS INICIALES POR DEFECTO
// ==========================================
const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "srv-1",
    name: "Balayage & Diseño de Color",
    category: "Colorimetría",
    price: 180,
    duration: "180 min",
    description: "Iluminación personalizada con protección capilar plex.",
  },
  {
    id: "srv-2",
    name: "Alisado Orgánico Espejo",
    category: "Tratamientos",
    price: 150,
    duration: "150 min",
    description: "Lacio sedoso libre de formol con brillo tridimensional.",
  },
  {
    id: "srv-3",
    name: "Botox Capilar Nutritivo",
    category: "Tratamientos",
    price: 90,
    duration: "90 min",
    description: "Restauración profunda para hebras deshidratadas o con frizz.",
  },
  {
    id: "srv-4",
    name: "Corte Bordado + Brushing",
    category: "Cortes",
    price: 55,
    duration: "60 min",
    description: "Eliminación de puntas abiertas sin perder el largo.",
  },
  {
    id: "srv-5",
    name: "Lifting de Pestañas & Laminado",
    category: "Mirada",
    price: 75,
    duration: "60 min",
    description: "Realce natural de mirada con tinte e hidratación de keratina.",
  },
  {
    id: "srv-6",
    name: "Manicure Gel & Nail Art",
    category: "Uñas",
    price: 50,
    duration: "60 min",
    description: "Cuidado de cutículas y esmaltado permanente de larga duración.",
  },
];

const DEFAULT_CLIENTS: Client[] = [
  {
    id: "cli-1",
    name: "Valeria Mendoza",
    phone: "987654321",
    lastVisit: "2026-07-10",
    lastService: "Balayage & Diseño de Color",
    notes: "Prefiere tonos beige cálidos, cabello sensible.",
    totalVisits: 4,
  },
  {
    id: "cli-2",
    name: "Camila Rojas",
    phone: "912345678",
    lastVisit: "2026-08-02",
    lastService: "Alisado Orgánico Espejo",
    notes: "Le gusta tomar café sin azúcar durante la sesión.",
    totalVisits: 6,
  },
  {
    id: "cli-3",
    name: "Luciana Paredes",
    phone: "955443322",
    lastVisit: "2026-08-25",
    lastService: "Botox Capilar Nutritivo",
    notes: "Cabello ondulado, busca controlar el frizz.",
    totalVisits: 3,
  },
  {
    id: "cli-4",
    name: "Andrea Salazar",
    phone: "998877665",
    lastVisit: "2026-09-24",
    lastService: "Lifting de Pestañas & Laminado",
    notes: "Ojos sensibles, usar adhesivo hipoalergénico.",
    totalVisits: 5,
  },
];

// ==========================================
// 4. GENERADOR DE MENSAJES RANDOM DE RECORDATORIO
// ==========================================
const MESSAGE_TEMPLATES = [
  (name: string, days: number, service: string) =>
    `¡Hola hermosa ${name}! 🌸 En *Warmi T'ika Studio* te extrañamos muchísimo. Vimos que ya pasaron ${days} días desde tu último *${service}* y queremos engreírte como mereces. ✨ Si agendas esta semana tienes un *detalle especial de hidratación gratis*. ¿Te gustaría que te separemos un turno? 💖`,

  (name: string, days: number, service: string) =>
    `¡Hola ${name} bella! ✨ Esperamos que estés teniendo una linda semana. Te escribimos de *Warmi T'ika* porque hace ${days} días nos visitaste para tu *${service}* y ya toca darle ese retoque de brillo y suavidad a tu imagen 🌸. ¿Qué día te queda cómodo para consentirte?`,

  (name: string, days: number, service: string) =>
    `¡Querida ${name}! 🌷 Tu espacio favorito en *Warmi T'ika Studio* te está esperando. Ya han pasado ${days} días desde tu última sesión de *${service}* y reservamos cupos preferenciales para nuestras clientas VIP como tú 💎. ¡Escríbenos para agendarte con una promoción exclusiva!`,

  (name: string, days: number, service: string) =>
    `¡Hola linda ${name}! 🌺 Dicen que un día de spa y belleza renueva toda la energía. Notamos que hace ${days} días no vienes por *Warmi T'ika* desde tu *${service}* ✨. ¡Ven a relajarte con nosotras esta semana! Tenemos horarios disponibles para ti 💖.`,

  (name: string, days: number, service: string) =>
    `¡Hola ${name}! 🌟 En *Warmi T'ika Studio* nos encanta verte brillar. Como ya pasaron ${days} días desde tu *${service}*, queremos invitarte a renovar tu look y mantener tu cuidado al 100% 🌸. Si reservas hoy, te regalamos un diagnóstico + ampolla nutritiva. ¿Te animas?`,

  (name: string, days: number, service: string) =>
    `¡Bella ${name}! 💖 Pasamos por aquí de *Warmi T'ika* para enviarte un abrazo enorme y recordarte que hace ${days} días fue tu cita de *${service}*. ¡No dejes pasar más tiempo sin tu momento de reina! 👑 Cuéntanos qué tarde tienes libre para reservarte turno.`,

  (name: string, days: number, service: string) =>
    `¡Hola ${name} preciosa! 🌸 ¡Tu cabello y tu belleza merecen un mimo hoy! Ya llevamos ${days} días sin verte por *Warmi T'ika Studio* desde que te realizaste *${service}* ✨. Esta semana tenemos 15% de descuento especial de retorno para ti. ¿Agendamos?`,

  (name: string, days: number, service: string) =>
    `¡Qué tal ${name} hermosa! 🌷 En *Warmi T'ika* revisamos nuestra agenda VIP y vimos que hace ${days} días te hiciste tu *${service}*. Para que el resultado siempre se mantenga radiante, te recomendamos tu sesión de mantenimiento esta semana ✨. ¿A qué hora te esperamos?`,
];

function calculateDaysSince(dateString: string): number {
  if (!dateString) return 999;
  const parsed = new Date(dateString + "T00:00:00");
  if (isNaN(parsed.getTime())) return 999;
  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : 0;
}

// ==========================================
// 5. COMPONENTE PRINCIPAL
// ==========================================
export default function WarmiTikaApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"public" | "admin">("admin");

  // Estados de base de datos
  const [clients, setClients] = useState<Client[]>(DEFAULT_CLIENTS);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Estados del generador de recordatorios y filtro
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [lastTemplateIdx, setLastTemplateIdx] = useState<number>(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados para agregar nuevo cliente
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");
  const [newClientLastVisit, setNewClientLastVisit] = useState<string>("");
  const [newClientService, setNewClientService] = useState<string>(
    DEFAULT_SERVICES[0].name
  );
  const [newClientNotes, setNewClientNotes] = useState<string>("");

  // Estados para reserva pública
  const [bookingName, setBookingName] = useState<string>("");
  const [bookingPhone, setBookingPhone] = useState<string>("");
  const [bookingService, setBookingService] = useState<string>(
    DEFAULT_SERVICES[0].name
  );
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("10:00");
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Conexión a Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (err) {
          console.error("Error en Auth:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    if (!user) return;

    const clientsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "clients"
    );
    const appointmentsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "appointments"
    );

    const unsubClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        setDbConnected(true);
        if (snapshot.empty) {
          // Sembrar clientes iniciales si la colección está vacía
          DEFAULT_CLIENTS.forEach(async (cli) => {
            await setDoc(doc(clientsRef, cli.id), cli);
          });
        } else {
          const loaded: Client[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as Client);
          });
          setClients(loaded);
        }
      },
      (error) => {
        console.error("Error leyendo clientes:", error);
        setDbConnected(false);
      }
    );

    const unsubAppointments = onSnapshot(appointmentsRef, (snapshot) => {
      const loadedApps: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        loadedApps.push(docSnap.data() as Appointment);
      });
      setAppointments(loadedApps);
    });

    return () => {
      unsubClients();
      unsubAppointments();
    };
  }, [user]);

  // ==========================================
  // ORDENAR CLIENTES: LOS QUE TIENEN MÁS TIEMPO SIN VISITA VAN ARRIBA
  // ==========================================
  const sortedClients = useMemo(() => {
    return [...clients]
      .filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm) ||
          c.lastService.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const daysA = calculateDaysSince(a.lastVisit);
        const daysB = calculateDaysSince(b.lastVisit);
        // Mayor cantidad de días sin visita primero (arriba del todo)
        return daysB - daysA;
      });
  }, [clients, searchTerm]);

  // Seleccionar automáticamente al cliente con más tiempo sin visita al abrir
  useEffect(() => {
    if (!selectedClient && sortedClients.length > 0) {
      handleSelectClientForMessage(sortedClients[0]);
    }
  }, [sortedClients]);

  // Función que genera un mensaje aleatorio garantizando que nunca se repita ni salga vacío
  const generateRandomInvitation = (client: Client) => {
    const days = calculateDaysSince(client.lastVisit);
    const safeDays = days === 999 ? 30 : Math.max(days, 1);
    const firstName = client.name.trim().split(" ")[0] || client.name;
    const service = client.lastService || "tratamiento de belleza";

    let randomIndex = Math.floor(Math.random() * MESSAGE_TEMPLATES.length);
    if (randomIndex === lastTemplateIdx && MESSAGE_TEMPLATES.length > 1) {
      randomIndex = (randomIndex + 1) % MESSAGE_TEMPLATES.length;
    }
    setLastTemplateIdx(randomIndex);

    const generatedText = MESSAGE_TEMPLATES[randomIndex](
      firstName,
      safeDays,
      service
    );
    setCustomMessage(generatedText);
  };

  const handleSelectClientForMessage = (client: Client) => {
    setSelectedClient(client);
    generateRandomInvitation(client);
  };

  // Agregar nuevo cliente a Firebase
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) return;

    const id = "cli-" + Date.now();
    const visitDate =
      newClientLastVisit || new Date().toISOString().split("T")[0];

    const newCli: Client = {
      id,
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      lastVisit: visitDate,
      lastService: newClientService,
      notes: newClientNotes.trim() || "Cliente frecuente",
      totalVisits: 1,
    };

    setClients((prev) => [...prev, newCli]);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientLastVisit("");
    setNewClientNotes("");

    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "clients",
        id
      );
      await setDoc(ref, newCli);
    } catch (err) {
      console.error("Error guardando cliente:", err);
    }
  };

  // Marcar que el cliente vino HOY (actualiza su fecha a hoy y baja al final de la lista)
  const handleMarkVisitedToday = async (client: Client) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const updated: Client = {
      ...client,
      lastVisit: todayStr,
      totalVisits: (client.totalVisits || 1) + 1,
    };

    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? updated : c))
    );

    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "clients",
        client.id
      );
      await updateDoc(ref, {
        lastVisit: todayStr,
        totalVisits: updated.totalVisits,
      });
    } catch (err) {
      console.error("Error actualizando visita:", err);
    }
  };

  // Eliminar cliente
  const handleDeleteClient = async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (selectedClient?.id === id) {
      setSelectedClient(null);
    }
    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "clients",
        id
      );
      await deleteDoc(ref);
    } catch (err) {
      console.error("Error eliminando cliente:", err);
    }
  };

  // Enviar mensaje por WhatsApp
  const handleSendWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("51")
      ? cleanPhone
      : `51${cleanPhone}`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Copiar mensaje al portapapeles
  const handleCopyMessage = () => {
    if (!customMessage) return;
    navigator.clipboard.writeText(customMessage);
    setCopiedId("copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Guardar cita desde la vista pública
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingName.trim() || !bookingPhone.trim() || !bookingDate) return;

    const id = "apt-" + Date.now();
    const newApt: Appointment = {
      id,
      clientName: bookingName.trim(),
      clientPhone: bookingPhone.trim(),
      serviceName: bookingService,
      date: bookingDate,
      time: bookingTime,
      status: "pendiente",
    };

    setAppointments((prev) => [newApt, ...prev]);
    setBookingSuccess(true);
    setBookingName("");
    setBookingPhone("");

    try {
      const ref = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "appointments",
        id
      );
      await setDoc(ref, newApt);
    } catch (err) {
      console.error("Error guardando cita:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF8F5] text-stone-800 font-sans">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-rose-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
                Warmi T&apos;ika
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  Beauty Studio
                </span>
              </h1>
              <p className="text-xs text-stone-500">
                Gestión Inteligente de Clientas & Recordatorios VIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador de conexión Firebase */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-xs font-medium">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  dbConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-400"
                }`}
              />
              <span>{dbConnected ? "Firebase Online" : "Conectando..."}</span>
            </div>

            {/* Selector de Vista */}
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "admin"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Panel Admin & Recordatorios
              </button>
              <button
                onClick={() => setActiveTab("public")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "public"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Web Pública
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* VISTA 1: PANEL DE ADMINISTRACIÓN Y RECORDATORIOS */}
      {/* ========================================== */}
      {activeTab === "admin" && (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* TARJETAS DE RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                  Clientes por Recuperar (+25 días)
                </p>
                <p className="text-3xl font-extrabold text-stone-900 mt-1">
                  {
                    clients.filter((c) => calculateDaysSince(c.lastVisit) >= 25)
                      .length
                  }
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Ubicadas automáticamente arriba en la lista
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Total Clientas Registradas
                </p>
                <p className="text-3xl font-extrabold text-stone-900 mt-1">
                  {clients.length}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Sincronizadas en Firebase
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Citas Web Recibidas
                </p>
                <p className="text-3xl font-extrabold text-stone-900 mt-1">
                  {appointments.length}
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  Reservas online activas
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* SECCIÓN PRINCIPAL: LISTA ORDENADA POR AUSENCIA + GENERADOR RANDOM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA IZQUIERDA (7 cols): LISTA DE CLIENTES (MÁS ANTIGUOS ARRIBA) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-rose-100 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-1">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Prioridad Inteligente Activada
                  </span>
                  <h2 className="text-lg font-bold text-stone-900">
                    Ranking de Clientas por Tiempo sin Visita
                  </h2>
                  <p className="text-xs text-stone-500">
                    Las clientas que llevan más días sin venir aparecen arriba
                    del todo para que les envíes su invitación.
                  </p>
                </div>

                {/* Buscador */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar clienta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Lista de clientes ordenada */}
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {sortedClients.map((client, index) => {
                  const daysInactive = calculateDaysSince(client.lastVisit);
                  const isUrgent = daysInactive >= 30;
                  const isWarning = daysInactive >= 15 && daysInactive < 30;
                  const isSelected = selectedClient?.id === client.id;

                  return (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClientForMessage(client)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-200"
                          : "border-stone-200 hover:border-rose-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Posición en la fila */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isUrgent
                              ? "bg-rose-600 text-white"
                              : isWarning
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          #{index + 1}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-stone-900 text-sm">
                              {client.name}
                            </h3>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                isUrgent
                                  ? "bg-rose-100 text-rose-700"
                                  : isWarning
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {daysInactive === 0
                                ? "Vino hoy ✨"
                                : `Hace ${daysInactive} días sin visita`}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 mt-1">
                            Último servicio:{" "}
                            <strong className="text-stone-800">
                              {client.lastService}
                            </strong>{" "}
                            • Fecha: {client.lastVisit}
                          </p>
                          {client.notes && (
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Nota: {client.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botones rápidos */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectClientForMessage(client);
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Recordar
                        </button>

                        <button
                          type="button"
                          title="Marcar que visitó hoy"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkVisitedToday(client);
                          }}
                          className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Vino Hoy
                        </button>

                        <button
                          type="button"
                          title="Eliminar cliente"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client.id);
                          }}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA DERECHA (5 cols): GENERADOR DE INVITACIÓN RANDOM */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 rounded-3xl p-6 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Invitación Inteligente WhatsApp
                  </span>
                  {selectedClient && (
                    <span className="text-xs bg-black/20 px-2.5 py-1 rounded-lg">
                      Tel: {selectedClient.phone}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-extrabold">
                    {selectedClient
                      ? `Mensaje para ${selectedClient.name}`
                      : "Selecciona una clienta de la lista"}
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Cada vez que presionas &quot;Cambiar Mensaje Random&quot; se
                    redacta una invitación cálida distinta para que no se vea
                    repetitiva.
                  </p>
                </div>

                {/* Caja de texto editable con el mensaje random */}
                <div className="bg-white rounded-2xl p-3 text-stone-800 shadow-inner">
                  <textarea
                    rows={5}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Selecciona una clienta para generar su invitación..."
                    className="w-full text-sm leading-relaxed focus:outline-none resize-none"
                  />
                </div>

                {/* Botones de Acción del Generador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!selectedClient}
                    onClick={() =>
                      selectedClient && generateRandomInvitation(selectedClient)
                    }
                    className="w-full py-3 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    🎲 Cambiar Mensaje Random
                  </button>

                  <button
                    type="button"
                    disabled={!selectedClient || !customMessage}
                    onClick={() =>
                      selectedClient &&
                      handleSendWhatsApp(selectedClient.phone, customMessage)
                    }
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Enviar por WhatsApp
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full py-2 rounded-xl bg-black/15 hover:bg-black/25 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      ¡Mensaje copiado al portapapeles!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar texto del mensaje
                    </>
                  )}
                </button>
              </div>

              {/* FORMULARIO PARA AGREGAR NUEVA CLIENTA */}
              <form
                onSubmit={handleAddClient}
                className="bg-white rounded-3xl border border-rose-100 shadow-sm p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-stone-900 text-base">
                    Registrar Clienta & Última Visita
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. María Fernanda"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      WhatsApp / Celular *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 987654321"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Fecha de Última Visita
                    </label>
                    <input
                      type="date"
                      value={newClientLastVisit}
                      onChange={(e) => setNewClientLastVisit(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Servicio Realizado
                    </label>
                    <select
                      value={newClientService}
                      onChange={(e) => setNewClientService(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400 bg-white"
                    >
                      {services.map((srv) => (
                        <option key={srv.id} value={srv.name}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">
                    Notas o preferencias
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Tono castaño claro, alérgica a..."
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Guardar Clienta en Base de Datos
                </button>
              </form>
            </div>
          </div>
        </main>
      )}

      {/* ========================================== */}
      {/* VISTA 2: PÁGINA WEB PÚBLICA PARA CLIENTAS */}
      {/* ========================================== */}
      {activeTab === "public" && (
        <div className="space-y-14 pb-16">
          {/* HERO */}
          <section className="relative bg-gradient-to-br from-rose-950 via-rose-900 to-stone-900 text-white py-20 px-4">
            <div className="max-w-5xl mx-auto text-center space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                Warmi T&apos;ika • Alta Peluquería & Spa
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Realza tu Belleza Natural con Cuidado Profesional
              </h2>
              <p className="text-rose-100/90 max-w-2xl mx-auto text-base">
                Especialistas en colorimetría avanzada, alisados orgánicos,
                tratamientos capilares y diseño de mirada en un ambiente creado
                para ti.
              </p>
            </div>
          </section>

          {/* CATÁLOGO DE SERVICIOS */}
          <section className="max-w-6xl mx-auto px-4 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-stone-900">
                Nuestros Servicios Exclusivos
              </h3>
              <p className="text-sm text-stone-500">
                Calidad premium y productos profesionales en cada sesión
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white rounded-3xl p-6 border border-rose-100 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                      {srv.category}
                    </span>
                    <h4 className="text-lg font-bold text-stone-900">
                      {srv.name}
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-extrabold text-rose-600">
                        S/ {srv.price}
                      </span>
                      <span className="block text-[11px] text-stone-400">
                        Duración: {srv.duration}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingService(srv.name)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                    >
                      Elegir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RESERVAR CITA */}
          <section className="max-w-xl mx-auto px-4">
            <form
              onSubmit={handleCreateBooking}
              className="bg-white rounded-3xl p-8 border border-rose-100 shadow-md space-y-4"
            >
              <h3 className="text-xl font-bold text-stone-900 text-center">
                Reserva tu Cita Online
              </h3>

              {bookingSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold text-center">
                  ¡Tu reserva fue registrada con éxito! Te contactaremos por
                  WhatsApp.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">
                  Tu Nombre
                </label>
                <input
                  type="text"
                  required
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">
                  Tu WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">
                  Servicio
                </label>
                <select
                  value={bookingService}
                  onChange={(e) => setBookingService(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} - S/ {s.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition"
              >
                Confirmar Reserva
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}