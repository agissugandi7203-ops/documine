import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "18px",
          backgroundColor: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          padding: "13px",
        }}
      >
        <div
          style={{
            width: "14px",
            height: "36px",
            borderRadius: "7px",
            backgroundColor: "#f4f3ef",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            height: "36px",
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "999px",
              backgroundColor: "#e85a24",
            }}
          />
          <div
            style={{
              width: "18px",
              height: "13px",
              borderRadius: "6px",
              backgroundColor: "#d7e5e0",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
