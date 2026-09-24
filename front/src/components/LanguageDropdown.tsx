const STORAGE_KEY = "preferred_language";

const languages = [
  { label: "English", code: "en" },
  { label: "French", code: "fr" },
  { label: "Spanish", code: "es" },
  { label: "German", code: "de" },
  { label: "Arabic", code: "ar" },

  // Major global languages
  { label: "Portuguese", code: "pt" },
  { label: "Portuguese (Brazil)", code: "pt-BR" },
  { label: "Hindi", code: "hi" },
  { label: "Chinese (Simplified)", code: "zh-CN" },
  { label: "Chinese (Traditional)", code: "zh-TW" },
  { label: "Japanese", code: "ja" },
  { label: "Korean", code: "ko" },
  { label: "Russian", code: "ru" },
  { label: "Italian", code: "it" },
  { label: "Dutch", code: "nl" },
  { label: "Turkish", code: "tr" },
  { label: "Polish", code: "pl" },
  { label: "Swedish", code: "sv" },
  { label: "Greek", code: "el" },
  { label: "Hebrew", code: "iw" },
  { label: "Thai", code: "th" },
  { label: "Vietnamese", code: "vi" },

  // African languages (useful for your region)
  { label: "Yoruba", code: "yo" },
  { label: "Igbo", code: "ig" },
  { label: "Hausa", code: "ha" },
  { label: "Swahili", code: "sw" },

  // Middle East / South Asia extras
  { label: "Urdu", code: "ur" },
  { label: "Bengali", code: "bn" },
];

function fadePage() {
  document.body.style.transition = "opacity 0.3s ease";
  document.body.style.opacity = "0.4";

  setTimeout(() => {
    document.body.style.opacity = "1";
  }, 300);
}

export default function LanguageDropdown() {
  const changeLanguage = (lang: string) => {
    const select = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement;

    if (select) {
      fadePage();

      select.value = lang;
      select.dispatchEvent(new Event("change"));

      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        height: 42,
        borderRadius: 14,
        border: "1px solid rgba(52, 211, 153, 0.28)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(15,23,42,0.96) 35%, rgba(15,23,42,0.96))",
        boxShadow: "0 10px 30px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: "100%",
          background: "linear-gradient(180deg, rgba(16,185,129,0.26), rgba(13,148,136,0.08))",
          color: "#d1fae5",
          fontSize: 18,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        🌐
      </span>

      <select
        onChange={(e) => changeLanguage(e.target.value)}
        defaultValue={localStorage.getItem(STORAGE_KEY) || "en"}
        aria-label="Select language"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          padding: "0 42px 0 12px",
          width: 170,
          height: "100%",
          border: "none",
          borderRadius: 14,
          cursor: "pointer",
          color: "#f8fafc",
          background: "transparent",
          outline: "none",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.02em",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          colorScheme: "dark",
        }}
      >
        {languages.map((l) => (
          <option
            key={l.code}
            value={l.code}
            style={{
              background: "#0f172a",
              color: "#f8fafc",
              padding: "8px 10px",
            }}
          >
            {l.label}
          </option>
        ))}
      </select>

      <span
        style={{
          position: "absolute",
          right: 14,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "6px solid rgba(240, 253, 250, 0.95)",
          pointerEvents: "none",
          filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.35))",
        }}
      />
    </div>
  );
}