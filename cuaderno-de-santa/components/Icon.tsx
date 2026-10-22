/** Íconos de interfaz (controles). Los emojis se quedan para lo que es de los niños: avatares, deberes, insignias. */
const PATHS = {
  musica: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  silencio: (
    <>
      <path d="M9 18V5l11-2v8" />
      <circle cx="6" cy="18" r="3" />
      <path d="M15 15l6 6M21 15l-6 6" />
    </>
  ),
  candado: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="3" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  borrar: (
    <>
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 001-1V6a1 1 0 00-1-1z" />
      <path d="M13 9.5l5 5M18 9.5l-5 5" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6L6 18" />,
  papelera: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
} as const;

export type NombreIcono = keyof typeof PATHS;

export function Icono({ nombre, size = 22 }: { nombre: NombreIcono; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      {PATHS[nombre]}
    </svg>
  );
}
