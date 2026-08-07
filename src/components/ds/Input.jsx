export default function Input({ label, type = "text", pin, invalid, error, value, onChange, placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? (
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-caption)",
            fontWeight: "var(--weight-heavy)",
            letterSpacing: "0.5px",
            color: "var(--ink-300)",
          }}
        >
          {label}
        </span>
      ) : null}
      <input
        type={pin ? "password" : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={pin ? 4 : undefined}
        inputMode={pin ? "numeric" : undefined}
        style={{
          border: `2px solid ${invalid ? "var(--color-error)" : "var(--cream-300)"}`,
          background: "#fff",
          borderRadius: "var(--radius-lg)",
          padding: "13px 16px",
          fontFamily: "var(--font-body)",
          fontSize: "1rem",
          fontWeight: "var(--weight-bold)",
          color: "var(--ink-900)",
          outline: "none",
          letterSpacing: pin ? "10px" : "normal",
          textAlign: pin ? "center" : "left",
        }}
      />
      {error ? (
        <span style={{ fontSize: "0.8rem", fontWeight: "var(--weight-bold)", color: "var(--color-error)" }}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
