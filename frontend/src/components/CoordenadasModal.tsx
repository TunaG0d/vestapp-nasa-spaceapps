import { useState } from 'react';
import { RotateCw, X, Calendar, MapPin, Check, Radio } from 'lucide-react';
import type { Zona } from '../mocks/fireData';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  zona: Zona;
  radioKm: number;
  anio: number;
  onAplicar: (params: {
    lat: number;
    lng: number;
    radio: number;
    rangoTipo: '7dias' | 'anio' | 'custom';
    fechaDesde?: string;
    fechaHasta?: string;
    perfilUsuario: string;
    actualizarSatelites: boolean;
  }) => void;
  onSyncLiveFirms: () => void;
  sincronizando: boolean;
}

export default function CoordenadasModal({
  abierto,
  onCerrar,
  zona,
  radioKm,
  anio,
  onAplicar,
  onSyncLiveFirms,
  sincronizando,
}: Props) {
  const [lat, setLat] = useState<string>(zona.center[0].toFixed(2));
  const [lng, setLng] = useState<string>(zona.center[1].toFixed(2));
  const [radio, setRadio] = useState<string>(String(radioKm || 50));
  const [rangoTipo, setRangoTipo] = useState<'7dias' | 'anio' | 'custom'>('anio');
  const [fechaDesde, setFechaDesde] = useState(`${anio}-01-01`);
  const [fechaHasta, setFechaHasta] = useState(`${anio}-12-31`);
  const [perfilUsuario, setPerfilUsuario] = useState<'Bomberos' | 'Docentes' | 'Gubernamental' | 'Civil'>('Docentes');
  const [actualizarSatelites, setActualizarSatelites] = useState<boolean>(true);

  if (!abierto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedLat = parseFloat(lat.replace(',', '.')) || zona.center[0];
    const parsedLng = parseFloat(lng.replace(',', '.')) || zona.center[1];
    const parsedRadio = parseFloat(radio.replace(',', '.')) || 50;

    onAplicar({
      lat: parsedLat,
      lng: parsedLng,
      radio: parsedRadio,
      rangoTipo,
      fechaDesde: rangoTipo === 'custom' ? fechaDesde : undefined,
      fechaHasta: rangoTipo === 'custom' ? fechaHasta : undefined,
      perfilUsuario,
      actualizarSatelites,
    });
    onCerrar();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coordenadas-modal-titulo"
        className="w-full max-w-xl rounded-2xl border border-[#2D3B48] bg-[#141B22] p-5 shadow-2xl text-white animate-in zoom-in-95 duration-150 text-xs"
      >
        {/* Cabecera (Imagen 1) */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D3B48]">
          <h2
            id="coordenadas-modal-titulo"
            className="text-sm font-extrabold tracking-wider text-slate-100 uppercase"
          >
            COORDENADAS PERSONALIZADAS
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="p-1 rounded-lg text-[#8C9BAA] hover:text-white hover:bg-[#2D3B48] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Fila 1: Latitud, Longitud, Radio */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#8C9BAA] mb-1">LATITUD</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-36.80"
                className="w-full rounded-xl bg-[#0B0F14] border border-[#3A4B5C] px-3 py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C9BAA] mb-1">LONGITUD</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-72.20"
                className="w-full rounded-xl bg-[#0B0F14] border border-[#3A4B5C] px-3 py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C9BAA] mb-1">RADIO (Km)</label>
              <input
                type="text"
                value={radio}
                onChange={(e) => setRadio(e.target.value)}
                placeholder="50"
                className="w-full rounded-xl bg-[#0B0F14] border border-[#3A4B5C] px-3 py-2 text-center text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 2: Rango temporal (últimos 7 días / Año completo / Rango personalizado) */}
          <div>
            <label className="block text-[11px] font-bold text-[#8C9BAA] mb-1.5">RANGO</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRangoTipo('7dias')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  rangoTipo === '7dias'
                    ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md'
                    : 'bg-[#0B0F14] border-[#3A4B5C] text-[#8C9BAA] hover:text-white'
                }`}
              >
                últimos 7 días
              </button>

              <button
                type="button"
                onClick={() => setRangoTipo('anio')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  rangoTipo === 'anio'
                    ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md'
                    : 'bg-[#0B0F14] border-[#3A4B5C] text-[#8C9BAA] hover:text-white'
                }`}
              >
                Año completo
              </button>

              <div className="flex items-center gap-1.5 bg-[#0B0F14] border border-[#3A4B5C] rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value);
                    setRangoTipo('custom');
                  }}
                  className="bg-transparent text-[11px] text-white font-mono focus:outline-none cursor-pointer"
                />
                <span className="text-[#8C9BAA]">-</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value);
                    setRangoTipo('custom');
                  }}
                  className="bg-transparent text-[11px] text-white font-mono focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Fila 3: Perfil de Usuario (Bomberos / Docentes / Gubernamental / Civil) */}
          <div>
            <label className="block text-[11px] font-bold text-[#8C9BAA] mb-1.5">USUARIO</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Bomberos', 'Docentes', 'Gubernamental', 'Civil'] as const).map((perfil) => {
                const activo = perfilUsuario === perfil;
                return (
                  <button
                    key={perfil}
                    type="button"
                    onClick={() => setPerfilUsuario(perfil)}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-semibold transition text-center ${
                      activo
                        ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-md'
                        : 'bg-[#0B0F14] border-[#3A4B5C] text-[#8C9BAA] hover:text-white'
                    }`}
                  >
                    {perfil}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 4: Resumen de Área activa con botón de refresco rojo (Imagen 1) */}
          <div className="rounded-xl bg-[#0B0F14] border border-[#2D3B48] p-2.5 flex items-center justify-between text-[11px] font-mono text-[#8C9BAA]">
            <span className="truncate pr-2">
              ÁREA ACTIVA: <strong className="text-white">{lat}°, {lng}°</strong> / Radio {radio} Km / Desde{' '}
              {rangoTipo === '7dias' ? 'últimos 7 días' : fechaDesde + ' al ' + fechaHasta}
            </span>
            <button
              type="button"
              onClick={onSyncLiveFirms}
              disabled={sincronizando}
              className={`p-1 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-950/40 transition shrink-0 ${
                sincronizando ? 'animate-spin' : ''
              }`}
              title="Sincronizar satélites NASA FIRMS NRT"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Fila 5: Switch Actualizar Satélites y Botón Aplicar configuración */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2D3B48]">
            {/* Switch Actualizar Satélites */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={actualizarSatelites}
                  onChange={(e) => setActualizarSatelites(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-9 h-5 rounded-full transition-colors ${
                    actualizarSatelites ? 'bg-blue-600' : 'bg-[#3A4B5C]'
                  }`}
                />
                <div
                  className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    actualizarSatelites ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-xs font-semibold text-slate-200">Actualizar Satelites</span>
            </label>

            {/* Botón Aplicar Configuración */}
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-900/40"
            >
              Aplicar configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
