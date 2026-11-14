import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the vermilion dot on ink — Crush's full stop, and its one signal. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2A2520",
        }}
      >
        <div style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: "#E0491F" }} />
      </div>
    ),
    { ...size },
  );
}
