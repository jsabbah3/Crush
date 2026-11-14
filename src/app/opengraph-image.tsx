import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crush — The companies you'd actually leave for.";

const RED = "#E0491F";
const INK = "#2A2520";
const PAPER = "#F6F2EA";
const MUTE = "#6E665D";

/** Social card: the cover of the list — masthead, rule, one headline. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 72px 60px",
          backgroundColor: PAPER,
          color: INK,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-end", fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
              Crush
              <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: RED, marginLeft: 4, marginBottom: 10 }} />
            </div>
            <div style={{ display: "flex", fontFamily: "sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.16em", color: MUTE }}>
              THE LIST
            </div>
          </div>
          <div style={{ display: "flex", height: 6, borderTop: `4px solid ${INK}`, borderBottom: `1.5px solid ${INK}` }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
              maxWidth: 1040,
            }}
          >
            <span>The companies you&apos;d&nbsp;</span>
            <span style={{ color: RED, fontStyle: "italic", fontWeight: 500 }}>actually&nbsp;</span>
            <span>leave for.</span>
          </div>
          <div style={{ display: "flex", marginTop: 30, fontFamily: "sans-serif", fontSize: 30, color: MUTE }}>
            One email, the day your exact role opens. crushco.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
