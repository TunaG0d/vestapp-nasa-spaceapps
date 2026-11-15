import { Flame, MapPin, Compass, Settings, ChevronDown, Languages, Users, Binary } from 'lucide-react';
import AccessibilityMenu from './AccessibilityMenu';

interface Props {
  onToggleBuscar: () => void;
  buscarAbierto: boolean;
  onToggleNavegacion: () => void;
  navegacionAbierta: boolean;
  onToggleAjustes: () => void;
  ajustesAbiertos: boolean;
  claro: boolean;
  setClaro: React.Dispatch<React.SetStateAction<boolean>>;
  daltonico: boolean;
  setDaltonico: React.Dispatch<React.SetStateAction<boolean>>;
  textoGrande: boolean;
  setTextoGrande: React.Dispatch<React.SetStateAction<boolean>>;
  altoContraste: boolean;
  setAltoContraste: React.Dispatch<React.SetStateAction<boolean>>;
  reducirMovimiento: boolean;
  setReducirMovimiento: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function HeaderNav({
  onToggleBuscar,
  buscarAbierto,
  onToggleNavegacion,
  navegacionAbierta,
  onToggleAjustes,
  ajustesAbiertos,
  claro,
  setClaro,
  daltonico,
  setDaltonico,
  textoGrande,
  setTextoGrande,
  altoContraste,
  setAltoContraste,
  reducirMovimiento,
  setReducirMovimiento,
}: Props) {
  return (
    <header className="relative z-30 h-16 w-full bg-[#0B0C10] border-b border-[#2D3B48]/80 px-4 flex items-center justify-between shadow-xl select-none">
      {/* Izquierda: Logotipo oficial de VestApp (con llama roja estilizada) */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <span className="absolute w-7 h-7 rounded-full bg-rose-600/30 blur-sm" />
          <Flame className="w-8 h-8 text-rose-500 fill-rose-500 relative drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-black tracking-tight text-white font-sans">VEST</span>
          <span className="text-2xl font-black tracking-tight text-rose-500 font-sans">APP</span>
        </div>
        <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-950/70 border border-rose-500/30 text-rose-300 uppercase tracking-wider font-mono">
          NASA Space Apps
        </span>
      </div>

      {/* Centro: Switch directo y visible de LENGUAJE SIMPLE (Ciudadano) vs TÉCNICO (Científico) */}
      <div className="hidden md:flex items-center gap-1.5 bg-[#141B22] p-1 rounded-xl border border-[#2D3B48] shadow-inner text-xs">
        <span className="text-[11px] font-bold text-[#8C9BAA] px-2 flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>LENGUAJE:</span>
        </span>
        <button
          type="button"
          onClick={() => setClaro(true)}
          aria-pressed={claro}
          title="Modo Ciudadano Claro: Explicaciones directas y empáticas sin tecnicismos complejos (Alt+C)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
            claro
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400'
              : 'text-[#8C9BAA] hover:text-white hover:bg-[#1F2833]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Ciudadano (Simple)</span>
        </button>
        <button
          type="button"
          onClick={() => setClaro(false)}
          aria-pressed={!claro}
          title="Modo Científico Técnico: Nomenclatura oficial NASA FIRMS (MODIS, VIIRS, FRP MW, celdas armonizadas)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs ${
            !claro
              ? 'bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-md ring-1 ring-cyan-400'
              : 'text-[#8C9BAA] hover:text-white hover:bg-[#1F2833]'
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Científico (Técnico)</span>
        </button>
      </div>

      {/* Derecha: Botones interactivos principales de la barra superior */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 1. BUSCAR / COLOCACIÓN */}
        <button
          type="button"
          onClick={onToggleBuscar}
          aria-expanded={buscarAbierto}
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-lg ${
            buscarAbierto
              ? 'bg-[#1F2833] border-cyan-400 text-white ring-1 ring-cyan-400'
              : 'bg-gradient-to-r from-[#1E2631] to-[#141B22] border-[#455A64] hover:border-cyan-400 text-slate-100 hover:text-white'
          }`}
        >
          <div className="w-5 h-5 rounded-full border border-rose-500/60 bg-rose-950/40 flex items-center justify-center text-rose-400">
            <MapPin className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline tracking-wide">BUSCAR/ COLOCACIÓN</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-rose-500 transition-transform duration-200 ${
              buscarAbierto ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 2. NAVEGACIÓN (Filtros de datos) */}
        <button
          type="button"
          onClick={onToggleNavegacion}
          aria-expanded={navegacionAbierta}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
            navegacionAbierta
              ? 'bg-[#1F2833] border-cyan-400 text-white'
              : 'bg-transparent border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1A232E]'
          }`}
        >
          <div className="w-5 h-5 rounded-full border border-rose-500/60 bg-rose-950/40 flex items-center justify-center text-rose-400">
            <Compass className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline tracking-wide text-white">NAVEGACIÓN</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-rose-500 transition-transform duration-200 ${
              navegacionAbierta ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* 3. MENÚ DE ACCESIBILIDAD UNIVERSAL (WCAG 2.1 AA/AAA) */}
        <AccessibilityMenu
          daltonico={daltonico}
          setDaltonico={setDaltonico}
          textoGrande={textoGrande}
          setTextoGrande={setTextoGrande}
          claro={claro}
          setClaro={setClaro}
          altoContraste={altoContraste}
          setAltoContraste={setAltoContraste}
          reducirMovimiento={reducirMovimiento}
          setReducirMovimiento={setReducirMovimiento}
        />

        {/* 4. AJUSTES (Preferencias) */}
        <button
          type="button"
          onClick={onToggleAjustes}
          aria-expanded={ajustesAbiertos}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
            ajustesAbiertos
              ? 'bg-[#1F2833] border-cyan-400 text-white'
              : 'bg-transparent border-transparent text-[#8C9BAA] hover:text-white hover:bg-[#1A232E]'
          }`}
        >
          <div className="w-5 h-5 rounded-full border border-rose-500/60 bg-rose-950/40 flex items-center justify-center text-rose-400">
            <Settings className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline tracking-wide text-white">AJUSTES</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-rose-500 transition-transform duration-200 ${
              ajustesAbiertos ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </header>
  );
}
