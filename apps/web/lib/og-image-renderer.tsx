import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "./site-metadata";

export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export function renderBrandSocialImage(subtitle = SITE_DESCRIPTION) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          backgroundColor: "#f3f2ee",
          color: "#18181b",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top Row: Geometric Brand Mark + Status Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                backgroundColor: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                gap: "6px",
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "#18181b",
                }}
              >
                {SITE_NAME}
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#6b6a65",
                }}
              >
                Atelier Edition
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: "#ffffff",
              border: "2px solid #e2dfd7",
              fontSize: "18px",
              fontWeight: 700,
              color: "#18181b",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "999px",
                backgroundColor: "#2c6b58",
              }}
            />
            <span>Verified Grounded Intelligence</span>
          </div>
        </div>

        {/* Center Editorial Title & Copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              fontSize: "62px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              color: "#18181b",
            }}
          >
            Read, inspect, and reason across every document.
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 500,
              lineHeight: 1.4,
              color: "#5c5b57",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom Feature Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {[
            { label: "Cited AI Chat", bg: "#18181b", fg: "#ffffff" },
            { label: "VS Code Repository IDE", bg: "#d7e5e0", fg: "#18181b" },
            { label: "Knowledge Graph", bg: "#e85a24", fg: "#ffffff" },
            { label: "SQL Analytics", bg: "#ffffff", fg: "#18181b" },
          ].map((pill) => (
            <div
              key={pill.label}
              style={{
                padding: "12px 22px",
                borderRadius: "999px",
                backgroundColor: pill.bg,
                color: pill.fg,
                border: "2px solid #e2dfd7",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {pill.label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...SOCIAL_IMAGE_SIZE,
    }
  );
}
