# El Cuaderno de Santa

PWA (Next.js 15 + Tailwind 4 + Supabase) para que Santa anote los deberes de Chris, Oriana y Anthony hasta Nochebuena (12 oct – 24 dic 2026).

- **Niños** (`/`, `/nino/[slug]`): tablero con trineo, estrellas, racha, insignias y niveles. Anthony ve solo íconos y estrellas.
- **Padres** (`/padres`): PIN de 6 dígitos, registro en 1–2 toques, deshacer, visitas de Oriana.
- **Reglas**: viven en `lib/santa.ts` (con tests: `npm test`). La seguridad vive en la base: el navegador solo lee; toda escritura pasa por funciones `santa_*` que exigen sesión de padres.

## Correr local

```bash
npm install
cp .env.example .env.local   # y pon los dos valores de abajo
npm run dev
```

Variables (son públicas por diseño; la protección real está en RLS y en las funciones):

```
NEXT_PUBLIC_SUPABASE_URL=https://gxyemdiynpspbtuewbkq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la anon/publishable key del proyecto cuaderno-de-santa>
```

## Desplegar (Vercel)

1. Sube el proyecto a un repo **nuevo** (no el de Lazo) e impórtalo en Vercel.
2. Agrega las dos variables de arriba en *Settings → Environment Variables*.
3. **Antes de compartir el enlace o instalarla en cualquier celular, abre `/padres` y crea el PIN.** Mientras no exista PIN, quien entre primero puede crearlo.
4. En el celular: abrir la URL → "Agregar a pantalla de inicio".

## Notas

- Un día sin registrar cuenta como cero. Se puede registrar hoy y los 3 días anteriores.
- Las visitas de Oriana (viernes–domingo, y el 24 de dic) ya están cargadas; los lunes festivos se agregan desde el panel de padres → "Visitas de Oriana".
- El panel se bloquea solo a los 10 min de inactividad. El bloqueo por intentos fallidos (5 → 10 min) es global.
