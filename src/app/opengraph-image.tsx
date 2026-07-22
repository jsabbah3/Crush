import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crush — The companies you'd actually leave for.";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#faf7f2",
          color: "#1c1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}>
          Crush
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 980,
          }}
        >
          The companies you&apos;d actually leave for.
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 32, color: "#78716c" }}>
          One alert, the moment your exact role opens. crushco.app
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 16,
            backgroundColor: "#c2570f",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
