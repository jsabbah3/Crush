import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const HEART =
  "M50 72 C50 72 26 57 26 41.5 C26 33 32.5 27 40 27 C44.5 27 48 29.4 50 33 C52 29.4 55.5 27 60 27 C67.5 27 74 33 74 41.5 C74 57 50 72 50 72 Z";

/** Favicon: the wax seal — a heart pressed into postal red. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: 64, height: 64, display: "flex" }}>
        <svg width="64" height="64" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="#E0491F" />
          <circle cx="50" cy="50" r="37" fill="none" stroke="#B23714" strokeWidth="3" />
          <path d={HEART} fill="#FFFDF8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
