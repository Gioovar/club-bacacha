# Guía de Despliegue en Producción — Club Bacachá (bacacha.com)

Esta guía detalla el paso a paso exacto para desplegar Club Bacachá en **Vercel**, conectarlo a tu base de datos **Supabase**, y vincular tu dominio oficial **bacacha.com** de **GoDaddy**.

---

## 1. Configuración de Supabase

### 1.1 Crear Proyecto
1. Ingresa a tu cuenta en [Supabase](https://supabase.com).
2. Haz clic en **New project**.
3. Selecciona tu organización, asigna el nombre `club-bacacha`, una contraseña segura para la base de datos y elige la región más cercana (ej. `us-east-1` o `us-west-1`).

### 1.2 Ejecutar la Migración SQL
1. En el panel izquierdo de Supabase, entra al **SQL Editor**.
2. Haz clic en **New query**.
3. Copia y pega el contenido completo del archivo:
   [`supabase/migrations/20261017000000_init_bacacha.sql`](./supabase/migrations/20261017000000_init_bacacha.sql)
4. Haz clic en **Run** (botón verde).
5. Se crearán todas las tablas (`members`, `profiles`, `member_consents`, `events`, `benefits`, etc.), la secuencia para el **Member ID correlativo (#000001)**, los índices y las políticas de seguridad **RLS (Row Level Security)**.

### 1.3 Configurar Supabase Auth (Sin contraseña / Magic Link)
1. En Supabase, ve a **Authentication > URL Configuration**.
2. En **Site URL**, escribe:
   ```
   https://bacacha.com
   ```
3. En **Redirect URLs**, agrega:
   ```
   https://bacacha.com/auth/callback
   http://localhost:3000/auth/callback
   ```
4. En **Authentication > Providers > Email**, asegúrate de que esté habilitado **Enable Email provider** y que esté activa la opción **Confirm email** o **Enable Magic Link**.

### 1.4 Obtener las Credenciales
Ve a **Project Settings > API** y copia:
- **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **service_role key** (secreto, dale a Reveal) -> `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Despliegue en Vercel

### 2.1 Subir a GitHub
En tu terminal local dentro de `CLUB BACACHA`:
```bash
git add .
git commit -m "Club Bacachá - Plataforma de Membresía y Producción"
```
Crea un repositorio en tu cuenta de GitHub (privado o público) y súbelo:
```bash
git remote add origin https://github.com/TU_USUARIO/club-bacacha.git
git branch -M main
git push -u origin main
```

### 2.2 Importar en Vercel
1. Entra a [Vercel](https://vercel.com) con tu cuenta.
2. Haz clic en **Add New... > Project**.
3. Selecciona tu repositorio de GitHub `club-bacacha`.
4. En el apartado **Environment Variables**, agrega las siguientes variables (usando los datos de Supabase):
   - `NEXT_PUBLIC_SITE_URL`: `https://bacacha.com`
   - `NEXT_PUBLIC_SUPABASE_URL`: (tu URL de Supabase)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: (tu clave anon/public de Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (tu clave anon/public de Supabase)
   - `SUPABASE_SERVICE_ROLE_KEY`: (tu clave service_role secreta)
5. Haz clic en **Deploy**.

---

## 3. Conexión del Dominio en GoDaddy (bacacha.com)

1. En el dashboard de tu proyecto en **Vercel**, ve a **Settings > Domains**.
2. Escribe `bacacha.com` y haz clic en **Add**.
3. Selecciona la opción recomendada: redireccionar `www.bacacha.com` a `bacacha.com` (o viceversa).
4. Vercel te mostrará los registros DNS requeridos:
   - **Registro A**:
     - Nombre / Host: `@`
     - Valor / Puntos a: `76.76.21.21`
   - **Registro CNAME**:
     - Nombre / Host: `www`
     - Valor / Puntos a: `cname.vercel-dns.com`
5. Entra a tu cuenta de **GoDaddy**:
   - Ve a **Mis Productos > bacacha.com > Administrar DNS** (DNS Records).
   - Edita o agrega el registro **A**:
     - **Tipo:** A
     - **Nombre:** `@`
     - **Datos:** `76.76.21.21`
     - **TTL:** 1 hora (o predeterminado)
   - Edita o agrega el registro **CNAME**:
     - **Tipo:** CNAME
     - **Nombre:** `www`
     - **Datos:** `cname.vercel-dns.com`
     - **TTL:** 1 hora
6. Guarda los cambios. La propagación DNS toma entre 5 y 30 minutos.
7. Vercel generará automáticamente el certificado **SSL (HTTPS)** gratuito.

---

## 4. Verificación de Funcionamiento

Una vez propagado el dominio, entra a [https://bacacha.com](https://bacacha.com):

1. **Age Gate:** Pulsa "SÍ, ENTRAR". La música de José José inicia en el 01:10 con botón de pausa visible.
2. **Registro Real:** Llena el formulario con tus datos y pulsa "UNIRME AL CLUB".
3. **Membresía Digital:** Recibirás tu credencial digital con tu número asignado (ej. `#000001`).
4. **Verificación de QR:** Escanea el QR con tu celular o ábrelo en otra ventana; verás la confirmación segura en `bacacha.com/m/[token]` sin exponer datos sensibles.
5. **Panel Admin:** Entra a `bacacha.com/admin` para consultar los miembros en vivo y exportar a CSV.
