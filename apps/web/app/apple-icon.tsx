import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "42px",
          backgroundColor: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "36px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "102px",
            borderRadius: "19px",
            backgroundColor: "#f4f3ef",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            height: "102px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "999px",
              backgroundColor: "#e85a24",
            }}
          />
          <div
            style={{
              width: "50px",
              height: "36px",
              borderRadius: "18px",
              backgroundColor: "#d7e5e0",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
