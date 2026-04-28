import React from "react";
import { ArrowLeft } from "lucide-react";

const FONT = "Mont, sans-serif";

interface SectionHeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  backgroundImage?: string;
  backgroundPosition?: string;
  overlay?: string;
  backgroundColor?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function SectionHero({
  title,
  subtitle,
  eyebrow,
  backgroundImage = "/navheader-background.jpeg",
  backgroundPosition = "center 40%",
  overlay = "rgba(10,30,60,0.45)",
  backgroundColor,
  onBack,
  actions,
  className,
}: SectionHeroProps) {
  const useSolidColor = !!backgroundColor && !backgroundImage;
  return (
    <div
      className={className}
      style={{
        ...(useSolidColor
          ? { backgroundColor }
          : {
              backgroundImage: `url('${backgroundImage}')`,
              backgroundSize: "cover",
              backgroundPosition,
            }),
        borderBottom: "1px solid #E8EAEE",
        padding: "14px 28px",
        marginBottom: "20px",
        position: "relative",
      }}
    >
      {!useSolidColor && <div style={{ position: "absolute", inset: 0, background: overlay }} />}
      <div
        style={{
          width: "100%",
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 420px", fontFamily: FONT }}>
          <div style={{ maxWidth: "960px" }}>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 mb-2 hover:opacity-80 transition"
                style={{ color: "#FFFFFF", fontFamily: FONT }}
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            {eyebrow && (
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.75)",
                  margin: "0 0 4px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontFamily: FONT,
                }}
              >
                {eyebrow}
              </p>
            )}
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 6px 0",
                fontFamily: FONT,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.25,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              flex: "0 1 auto",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
