import QRCode from "qrcode";
import {
  buildMemberVerificationUrl,
  formatMemberBadge,
  formatMemberFullName,
} from "./welcome";

export interface CredentialMemberData {
  id: string;
  member_number: string | number;
  first_name: string;
  last_name: string;
  qr_token: string;
  membership_level?: string;
  city?: string;
  created_at?: string;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

let cachedLogoImage: HTMLImageElement | null = null;

function loadOfficialLogo(): Promise<HTMLImageElement> {
  if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth > 0) {
    return Promise.resolve(cachedLogoImage);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cachedLogoImage = img;
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = "/logo.png";
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Dibuja texto con espaciado (tracking) controlado centrado horizontalmente.
 */
function drawTrackedTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  letterSpacingPx: number
) {
  const chars = Array.from(text);
  if (chars.length === 0) return;

  let totalWidth = 0;
  const charWidths = chars.map((ch) => {
    const w = ctx.measureText(ch).width;
    totalWidth += w;
    return w;
  });
  totalWidth += letterSpacingPx * (chars.length - 1);

  let currentX = centerX - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], currentX, y);
    currentX += charWidths[i] + letterSpacingPx;
  }

  ctx.textAlign = prevAlign;
}

/**
 * Divide o ajusta el nombre del socio para que siempre tenga márgenes amplios y excelente legibilidad.
 */
function drawMemberFullName(
  ctx: CanvasRenderingContext2D,
  fullName: string,
  centerX: number,
  baseY: number,
  maxWidth: number
): number {
  const upperName = fullName.toUpperCase();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";

  // Probar en una sola línea reduciendo gradualmente de 46px a 32px
  for (let fontSize = 46; fontSize >= 32; fontSize -= 2) {
    ctx.font = `600 ${fontSize}px "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    if (ctx.measureText(upperName).width <= maxWidth) {
      ctx.fillText(upperName, centerX, baseY);
      return baseY + 24;
    }
  }

  // Si aún es muy largo, dividir en 2 líneas balanceadas
  const words = upperName.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  ctx.font = `600 34px "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(line1, centerX, baseY - 16);
  ctx.fillText(line2, centerX, baseY + 26);
  return baseY + 46;
}

/**
 * Genera la credencial digital personalizada en PNG de alta calidad (1080 × 1350 px).
 * Utiliza los datos reales del miembro en Supabase y el logotipo oficial sin alterarlo.
 */
export async function generateMemberCredentialPng(
  member: CredentialMemberData
): Promise<{ dataUrl: string; blob: Blob; verificationUrl: string; filename: string }> {
  if (!member.qr_token) {
    throw new Error("El miembro no cuenta con un token QR válido.");
  }

  const verificationUrl = buildMemberVerificationUrl(member.qr_token);
  const formattedNumber = formatMemberBadge(member.member_number);
  const fullName = formatMemberFullName(member);

  if (!fullName) {
    throw new Error("El miembro no tiene un nombre válido registrado.");
  }

  // 1. Generar QR único de alta nitidez (negro puro sobre blanco puro, corrección de errores alta)
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 420,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: "#050505",
      light: "#FFFFFF",
    },
  });

  // 2. Cargar logotipo oficial (/logo.png) e imagen QR en paralelo
  const [logoImg, qrImg] = await Promise.all([
    loadOfficialLogo(),
    loadImageFromDataUrl(qrDataUrl),
  ]);

  // 3. Crear lienzo 1080 × 1350 px
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No fue posible inicializar el motor gráfico para la credencial.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 4. Fondo negro elegante y profundo (sin degradados exagerados ni efectos 3D)
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Superficie interior negro mate con márgenes amplios (64px)
  drawRoundedRect(ctx, 64, 64, CANVAS_WIDTH - 128, CANVAS_HEIGHT - 128, 28);
  ctx.fillStyle = "#090909";
  ctx.fill();

  // Marco exterior fino dorado oficial
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.36)";
  ctx.stroke();

  // Segundo hilo interior minimalista
  drawRoundedRect(ctx, 80, 80, CANVAS_WIDTH - 160, CANVAS_HEIGHT - 160, 20);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.stroke();

  const centerX = CANVAS_WIDTH / 2;

  // 5. Logotipo oficial de Club Bacachá (sin modificarlo, recortarlo ni recrearlo)
  const logoMaxDim = 200;
  const aspect = logoImg.naturalWidth / (logoImg.naturalHeight || 1);
  const logoW = aspect >= 1 ? logoMaxDim : logoMaxDim * aspect;
  const logoH = aspect >= 1 ? logoMaxDim / aspect : logoMaxDim;
  const logoX = centerX - logoW / 2;
  const logoY = 128;

  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

  // 6. Encabezado editorial limpio
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 28px "Instrument Sans", -apple-system, BlinkMacSystemFont, sans-serif`;
  drawTrackedTextCentered(ctx, "CLUB BACACHÁ", centerX, 378, 9);

  ctx.fillStyle = "#D4AF37";
  ctx.font = `500 15px "Instrument Sans", ui-monospace, monospace`;
  drawTrackedTextCentered(ctx, "CREDENCIAL OFICIAL DE SOCIO", centerX, 414, 6);

  // Línea divisoria minimalista dorada
  ctx.beginPath();
  ctx.moveTo(centerX - 56, 442);
  ctx.lineTo(centerX + 56, 442);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
  ctx.stroke();

  // 7. Código QR único, centrado y perfectamente escaneable
  const qrBoxSize = 468;
  const qrBoxX = centerX - qrBoxSize / 2;
  const qrBoxY = 480;

  // Marco sutil exterior al QR
  drawRoundedRect(ctx, qrBoxX - 6, qrBoxY - 6, qrBoxSize + 12, qrBoxSize + 12, 30);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.45)";
  ctx.stroke();

  // Base blanca pura para máxima lectura óptica del QR
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  const qrPadding = 24;
  ctx.drawImage(
    qrImg,
    qrBoxX + qrPadding,
    qrBoxY + qrPadding,
    qrBoxSize - qrPadding * 2,
    qrBoxSize - qrPadding * 2
  );

  // 8. Información real del miembro (Nombre completo y Número #000049)
  ctx.fillStyle = "#D4AF37";
  ctx.font = `500 15px "Instrument Sans", ui-monospace, monospace`;
  drawTrackedTextCentered(ctx, "TITULAR DE LA MEMBRESÍA", centerX, 1012, 6);

  // Nombre completo del miembro en blanco con márgenes amplios (820px máx)
  const afterNameY = drawMemberFullName(ctx, fullName, centerX, 1068, 820);

  // Contenedor minimalista para el número de miembro #000049
  const badgeWidth = 340;
  const badgeHeight = 76;
  const badgeX = centerX - badgeWidth / 2;
  const badgeY = afterNameY + 18;

  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 16);
  ctx.fillStyle = "#111111";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
  ctx.stroke();

  ctx.fillStyle = "#D4AF37";
  ctx.font = `700 38px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  drawTrackedTextCentered(ctx, formattedNumber, centerX, badgeY + 51, 3);

  // 9. Pie institucional discreto
  ctx.fillStyle = "rgba(236, 232, 225, 0.45)";
  ctx.font = `500 13px "Instrument Sans", ui-monospace, monospace`;
  drawTrackedTextCentered(
    ctx,
    "BACACHA.COM  ·  ACCESO PERSONAL E INTRANSFERIBLE",
    centerX,
    1248,
    4
  );

  // 10. Exportar como PNG de alta calidad
  const dataUrl = canvas.toDataURL("image/png", 1.0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Error al codificar el archivo PNG."));
      },
      "image/png",
      1.0
    );
  });

  const safeSlug = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cleanNum = formattedNumber.replace("#", "");
  const filename = `credencial-bacacha-${cleanNum}-${safeSlug || "socio"}.png`;

  return {
    dataUrl,
    blob,
    verificationUrl,
    filename,
  };
}

/**
 * Descarga en el navegador la credencial PNG generada.
 */
export function triggerCredentialDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

