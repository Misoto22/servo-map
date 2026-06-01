import { ImageResponse } from "next/og";

export const alt = "ServoMap — Australian Fuel Prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#0C0B09",
          padding: "80px",
          color: "#FAF7F2",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#E8A33D",
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          ServoMap
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            marginTop: 24,
            lineHeight: 1.05,
          }}
        >
          Australian Fuel Prices
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#B8B2A8", marginTop: 24 }}>
          Find the cheapest petrol &amp; diesel near you
        </div>
      </div>
    ),
    { ...size },
  );
}
