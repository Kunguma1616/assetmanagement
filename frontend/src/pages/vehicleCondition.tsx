import React, { useState, useCallback, useRef, useEffect } from "react";

/* ── TypeScript Interfaces ── */
interface VehicleForm {
  Id: string;
  Name: string;
  CreatedDate: string;
}

interface VehicleFormsResponse {
  vehicle: string;
  forms_count: number;
  forms: VehicleForm[];
  message?: string;
}

interface FormDetail {
  Id: string;
  Name: string;
  Owner?: { Name: string };
  Description__c?: string;
  Current_Engineer_Assignes_to_Vehicle__r?: { Name: string };
  Inspection_Result__c?: string;
  CreatedDate: string;
}

interface ImageRecord {
  id: string;
  title: string;
  url: string;
}

interface FormWithImagesResponse {
  form: FormDetail;
  images: ImageRecord[];
}

interface LazyImageProps {
  src: string;
  alt: string;
  onClick: () => void;
}

interface LightboxProps {
  image: ImageRecord | null;
  onClose: () => void;
}

/* ── Config ── */
const API_BASE = "/api/vehicle-condition";  // ✅ FIXED - was http://localhost:8000/api/vehicle-condition

/* ── Company Design Tokens ── */
const C = {
  brand: { blue: "#27549D", yellow: "#F1FF24" },
  primary: { light: "#7099DB", default: "#27549D", darker: "#17325E", subtle: "#F7F9FD" },
  error: { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#FAEDEA" },
  warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FEF5EC" },
  gray: { title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3", negative: "#F3F4F6", disabled: "#CDD1DA", border: "#CDD1DA", borderSubtle: "#E8EAEE", surface: "#F3F4F6" },
  text: { title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3", disabled: "#CDD1DA", negative: "#F3F4F6" },
  border: { primary: "#DEE8F7", error: "#F6DBD5", warning: "#FCE9D4", default: "#CDD1DA", subtle: "#E8EAEE" },
  surface: { primarySubtle: "#F7F9FD", errorSubtle: "#FAEDEA", warningSubtle: "#FEF5EC" },
} as const;

const FONT = "'Mont', 'Montserrat', sans-serif";
const IMAGES_PER_PAGE = 20;

/* ── Lazy Image Component ── */
const LazyImage: React.FC<LazyImageProps> = ({ src, alt, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [inView, setInView] = useState<boolean>(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        aspectRatio: "1",
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "pointer",
        background: loaded ? "transparent" : C.gray.negative,
        border: `1px solid ${C.border.subtle}`,
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(39,84,157,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.gray.caption,
            fontSize: "12px",
            fontFamily: FONT,
          }}
        >
          Loading...
        </div>
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />
      )}
    </div>
  );
};

/* ── Lightbox Component ── */
const Lightbox: React.FC<LightboxProps> = ({ image, onClose }) => {
  if (!image) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(26,29,35,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        backdropFilter: "blur(8px)",
        animation: "vcFadeIn 0.2s ease",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "90vw" }}>
        <img
          src={image.url}
          alt={image.title}
          style={{
            maxWidth: "90vw",
            maxHeight: "80vh",
            borderRadius: "10px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        />
        <p
          style={{
            color: "#FFFFFF",
            marginTop: "14px",
            fontFamily: FONT,
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {image.title}
        </p>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const VehicleCondition: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [forms, setForms] = useState<VehicleFormsResponse | null>(null);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [formDetail, setFormDetail] = useState<FormDetail | null>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [lightboxImage, setLightboxImage] = useState<ImageRecord | null>(null);
  const [imagePage, setImagePage] = useState<number>(1);

  const handleSearch = useCallback(async (): Promise<void> => {
    const term = searchTerm.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setForms(null);
    setSelectedForm(null);
    setFormDetail(null);
    setImages([]);
    setImagePage(1);

    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error("Failed to fetch vehicle data");
      const data: VehicleFormsResponse = await res.json();
      if (data.message === "Vehicle not found") {
        setError("Vehicle not found. Check the number and try again.");
      } else {
        setForms(data);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleSelectForm = useCallback(async (formId: string): Promise<void> => {
    setSelectedForm(formId);
    setFormLoading(true);
    setFormDetail(null);
    setImages([]);
    setImagePage(1);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/form/${formId}`);
      if (!res.ok) throw new Error("Form not found");
      const data: FormWithImagesResponse = await res.json();
      setFormDetail(data.form);
      setImages(data.images || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load form");
    } finally {
      setFormLoading(false);
    }
  }, []);

  const totalPages: number = Math.ceil(images.length / IMAGES_PER_PAGE);
  const paginatedImages: ImageRecord[] = images.slice(0, imagePage * IMAGES_PER_PAGE);

  const formatDate = (iso: string | undefined): string => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pill = (
    bg: string,
    color: string,
    border: string
  ): React.CSSProperties => ({
    fontSize: "11px",
    fontFamily: FONT,
    fontWeight: 600,
    color,
    background: bg,
    padding: "4px 12px",
    borderRadius: "20px",
    border: `1px solid ${border}`,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  });

  const metaLabel: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: "11px",
    color: C.gray.caption,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    fontWeight: 600,
    marginBottom: "4px",
  };

  const handleBackToForms = (): void => {
    setSelectedForm(null);
    setFormDetail(null);
    setImages([]);
    setImagePage(1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", color: C.text.body, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes vcFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes vcSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes vcSpin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:6px }
        ::-webkit-scrollbar-track { background:#F3F4F6 }
        ::-webkit-scrollbar-thumb { background:#CDD1DA; border-radius:3px }
      `}</style>

      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />

      {/* ── Header ── */}
      <header
        style={{
          padding: "0 32px",
          height: "68px",
          display: "flex",
          alignItems: "center",
          borderBottom: `1px solid ${C.border.subtle}`,
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "1200px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              background: C.brand.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 800,
              fontFamily: FONT,
            }}
          >
            VC
          </div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: C.text.title,
              letterSpacing: "-0.2px",
            }}
          >
            Vehicle Condition
          </h1>
          <span style={pill(C.surface.primarySubtle, C.primary.default, C.border.primary)}>
            Inspector
          </span>
        </div>
      </header>

      {/* ── Search Section ── */}
      <div style={{ background: C.primary.darker, padding: "36px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "14px",
            }}
          >
            Search by vehicle number, registration, or van number
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && handleSearch()
                }
                placeholder="e.g. VAN-0042, AB12 CDE..."
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 44px",
                  borderRadius: "8px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontFamily: FONT,
                  fontWeight: 500,
                  outline: "none",
                  transition: "border 0.2s, background 0.2s",
                }}
                onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                  e.target.style.borderColor = C.brand.yellow;
                  e.target.style.background = "rgba(255,255,255,0.12)";
                }}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  e.target.style.background = "rgba(255,255,255,0.08)";
                }}
              />
              <svg
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                }}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              style={{
                padding: "14px 30px",
                borderRadius: "8px",
                border: "none",
                background: C.brand.yellow,
                color: C.primary.darker,
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: FONT,
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.3px",
                transition: "opacity 0.2s, transform 0.15s",
                opacity: !searchTerm.trim() ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (searchTerm.trim()) (e.target as HTMLButtonElement).style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        {/* Error */}
        {error && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "8px",
              background: C.surface.errorSubtle,
              border: `1px solid ${C.border.error}`,
              color: C.error.darker,
              fontSize: "14px",
              fontWeight: 500,
              animation: "vcSlideUp 0.3s ease",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: `3px solid ${C.border.subtle}`,
                borderTop: `3px solid ${C.brand.blue}`,
                margin: "0 auto 16px",
                animation: "vcSpin 0.8s linear infinite",
              }}
            />
            <p style={{ color: C.gray.caption, fontSize: "13px", fontWeight: 500 }}>
              Searching Salesforce...
            </p>
          </div>
        )}

        {/* ── Forms List ── */}
        {forms && !selectedForm && (
          <div style={{ animation: "vcSlideUp 0.35s ease" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: C.text.title }}>
                Vehicle{" "}
                <span style={{ color: C.brand.blue, fontWeight: 700 }}>{forms.vehicle}</span>
              </h2>
              <span style={pill(C.surface.primarySubtle, C.brand.blue, C.border.primary)}>
                {forms.forms_count} form{forms.forms_count !== 1 ? "s" : ""}
              </span>
            </div>

            {forms.forms_count === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: C.gray.caption,
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                No condition forms found for this vehicle.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {forms.forms.map((form: VehicleForm, i: number) => (
                  <button
                    key={form.Id}
                    onClick={() => handleSelectForm(form.Id)}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: "8px",
                      border: `1px solid ${C.border.subtle}`,
                      background: "#FFFFFF",
                      color: C.text.body,
                      textAlign: "left" as const,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontFamily: FONT,
                      transition: "background 0.15s, border-color 0.15s",
                      animation: `vcSlideUp 0.3s ease ${i * 0.03}s both`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = C.surface.primarySubtle;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = C.border.primary;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = C.border.subtle;
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: C.text.title,
                          marginBottom: "3px",
                        }}
                      >
                        {form.Name}
                      </div>
                      <div style={{ fontSize: "12px", color: C.gray.caption, fontWeight: 500 }}>
                        {formatDate(form.CreatedDate)}
                      </div>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.gray.disabled}
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Form Detail + Images ── */}
        {selectedForm && (
          <div style={{ animation: "vcSlideUp 0.35s ease" }}>
            <button
              onClick={handleBackToForms}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: C.brand.blue,
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: FONT,
                fontWeight: 600,
                padding: 0,
                marginBottom: "24px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to forms
            </button>

            {formLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: `3px solid ${C.border.subtle}`,
                    borderTop: `3px solid ${C.brand.blue}`,
                    margin: "0 auto 16px",
                    animation: "vcSpin 0.8s linear infinite",
                  }}
                />
                <p style={{ color: C.gray.caption, fontSize: "13px", fontWeight: 500 }}>
                  Loading form & images...
                </p>
              </div>
            ) : (
              formDetail && (
                <>
                  {/* Meta Card */}
                  <div
                    style={{
                      padding: "24px",
                      borderRadius: "10px",
                      border: `1px solid ${C.border.subtle}`,
                      background: "#FFFFFF",
                      marginBottom: "32px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "20px",
                      }}
                    >
                      <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text.title }}>
                        {formDetail.Name}
                      </h2>
                      {formDetail.Inspection_Result__c && (
                        <span
                          style={pill(
                            formDetail.Inspection_Result__c === "Pass" ? "#E8F8EB" : C.surface.warningSubtle,
                            formDetail.Inspection_Result__c === "Pass" ? "#1A7A2E" : C.warning.darker,
                            formDetail.Inspection_Result__c === "Pass" ? "#B6E4BF" : C.border.warning
                          )}
                        >
                          {formDetail.Inspection_Result__c}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "18px",
                        fontSize: "13px",
                      }}
                    >
                      {[
                        { label: "Owner", value: formDetail.Owner?.Name },
                        {
                          label: "Engineer",
                          value: formDetail.Current_Engineer_Assignes_to_Vehicle__r?.Name,
                        },
                        { label: "Created", value: formatDate(formDetail.CreatedDate) },
                      ].map(
                        (item) =>
                          item.value && (
                            <div key={item.label}>
                              <div style={metaLabel}>{item.label}</div>
                              <div style={{ color: C.text.body, fontWeight: 500 }}>{item.value}</div>
                            </div>
                          )
                      )}
                    </div>

                    {formDetail.Description__c && (
                      <div
                        style={{
                          marginTop: "18px",
                          paddingTop: "18px",
                          borderTop: `1px solid ${C.border.subtle}`,
                        }}
                      >
                        <div style={metaLabel}>Description</div>
                        <p style={{ color: C.text.subtle, lineHeight: 1.65, fontSize: "14px" }}>
                          {formDetail.Description__c}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Images Section */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "18px",
                      }}
                    >
                      <h3 style={{ fontSize: "15px", fontWeight: 600, color: C.text.title }}>
                        Inspection Photos
                      </h3>
                      <span style={pill(C.gray.negative, C.gray.subtle, C.border.subtle)}>
                        {images.length} image{images.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {images.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "50px 0",
                          color: C.gray.caption,
                          fontSize: "14px",
                          fontWeight: 500,
                          background: C.gray.negative,
                          borderRadius: "10px",
                        }}
                      >
                        No images attached to this form.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          {paginatedImages.map((img: ImageRecord, i: number) => (
                            <div
                              key={img.id}
                              style={{
                                animation: `vcSlideUp 0.3s ease ${(i % IMAGES_PER_PAGE) * 0.02}s both`,
                              }}
                            >
                              <LazyImage
                                src={img.url}
                                alt={img.title}
                                onClick={() => setLightboxImage(img)}
                              />
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: C.gray.caption,
                                  fontWeight: 500,
                                  marginTop: "6px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={img.title}
                              >
                                {img.title}
                              </p>
                            </div>
                          ))}
                        </div>

                        {imagePage < totalPages && (
                          <div style={{ textAlign: "center", marginTop: "28px" }}>
                            <button
                              onClick={() => setImagePage((p: number) => p + 1)}
                              style={{
                                padding: "12px 28px",
                                borderRadius: "8px",
                                border: `1px solid ${C.border.primary}`,
                                background: C.surface.primarySubtle,
                                color: C.brand.blue,
                                fontSize: "13px",
                                fontFamily: FONT,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                ((e.target as HTMLButtonElement).style.background = "#EDF2FA")
                              }
                              onMouseLeave={(e) =>
                                ((e.target as HTMLButtonElement).style.background =
                                  C.surface.primarySubtle)
                              }
                            >
                              Load more ({images.length - imagePage * IMAGES_PER_PAGE} remaining)
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !forms && !error && (
          <div style={{ textAlign: "center", padding: "100px 0", animation: "vcFadeIn 0.5s ease" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "14px",
                background: C.surface.primarySubtle,
                border: `1px solid ${C.border.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.brand.blue}
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p style={{ color: C.text.body, fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
              Search for a vehicle
            </p>
            <p style={{ color: C.gray.caption, fontSize: "13px", fontWeight: 500 }}>
              Enter a vehicle number, registration, or van number above
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default VehicleCondition;
