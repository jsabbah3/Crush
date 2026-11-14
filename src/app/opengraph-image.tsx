import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crush — The companies you'd actually leave for.";

const RED = "#E0491F";
const BLUE = "#2548B8";
const INK = "#17204A";
const PAPER = "#FFFDF8";

const HEART =
  "M50 72 C50 72 26 57 26 41.5 C26 33 32.5 27 40 27 C44.5 27 48 29.4 50 33 C52 29.4 55.5 27 60 27 C67.5 27 74 33 74 41.5 C74 57 50 72 50 72 Z";

/** Social card: the envelope. An airmail border around the one line that matters. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 26,
          backgroundColor: INK,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
            backgroundColor: PAPER,
            color: INK,
            fontFamily: "serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <svg width="72" height="72" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill={RED} />
                <circle cx="50" cy="50" r="37" fill="none" stroke="#B23714" strokeWidth="3" />
                <path d={HEART} fill={PAPER} />
              </svg>
              <div style={{ display: "flex", fontSize: 60, fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.02em" }}>
                Crush
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: BLUE,
              }}
            >
              PAR AVION
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize: 86,
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.035em",
                maxWidth: 1000,
              }}
            >
              <span>The companies you&apos;d&nbsp;</span>
              <span style={{ color: RED, fontStyle: "italic" }}>actually&nbsp;</span>
              <span>leave for.</span>
            </div>
            <div style={{ display: "flex", marginTop: 30, fontFamily: "sans-serif", fontSize: 30, color: "#5E6788" }}>
              One letter, the day your exact role opens. crushco.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
