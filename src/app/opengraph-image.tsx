import { ImageResponse } from "next/og";

export const alt = "Club Bacachá — ¿Tú ya eres del Club?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#050505",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 90px",
          color: "#ece8e1",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 28, letterSpacing: "0.28em", fontWeight: 700 }}>
            BACACHÁ
          </span>
          <span
            style={{
              fontSize: 14,
              letterSpacing: "0.3em",
              border: "1px solid rgba(236,232,225,0.3)",
              padding: "8px 18px",
              borderRadius: "999px",
            }}
          >
            CLUB PRIVADO
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: 84,
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              margin: 0,
              fontWeight: 900,
            }}
          >
            ¿TÚ YA ERES DEL CLUB?
          </h1>
          <p style={{ fontSize: 24, color: "#8c8a85", margin: 0, maxWidth: "700px" }}>
            Hay cosas que no publicamos. Se las contamos al Club.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(236,232,225,0.15)",
            paddingTop: "32px",
          }}
        >
          <span style={{ fontSize: 16, letterSpacing: "0.25em", color: "#8c8a85" }}>
            ACAPULCO · MEMBRESÍA PRIVADA
          </span>
          <span style={{ fontSize: 16, letterSpacing: "0.2em", color: "#ece8e1" }}>
            BACACHA.COM
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
