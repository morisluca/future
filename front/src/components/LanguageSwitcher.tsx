import LanguageDropdown from "./LanguageDropdown";

const STORAGE_KEY = "preferred_language";

const languages = [
  { label: "English", code: "en" },
  { label: "French", code: "fr" },
  { label: "Spanish", code: "es" },
  { label: "German", code: "de" },
  { label: "Arabic", code: "ar" },
];

// Google Translate DOM hack:

// is not officially supported API
// can break if Google changes .goog-te-combo
// not SEO-friendly

function fadePage() {
  document.body.style.transition = "opacity 0.3s ease";
  document.body.style.opacity = "0.3";

  setTimeout(() => {
    document.body.style.opacity = "1";
  }, 400);
}

export default function LanguageSwitcher() {
  const changeLanguage = (lang: string) => {
    const select = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement;

    if (select) {
      // fade effect before switching
      fadePage();

      select.value = lang;
      select.dispatchEvent(new Event("change"));

      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  return (
    <>
     <LanguageDropdown />
    </>
  );
}