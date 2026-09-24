import { useEffect } from "react";

const STORAGE_KEY = "preferred_language";

function getBrowserLanguage() {
  if (typeof window === "undefined" || typeof navigator === "undefined" || navigator.language.split("-")[0] === "zh") return "zh-CN";
 
  if (typeof navigator === "undefined") return "zh-CN";
  return navigator.language.split("-")[0] || "zh-CN";

}

export function useGoogleTranslate(defaultLang = "en") {
  useEffect(() => {
    const savedLang = localStorage.getItem(STORAGE_KEY);
    const initialLang = savedLang || getBrowserLanguage() || defaultLang;

    const applyLanguage = (lang: string) => {
      const select = document.querySelector(
        ".goog-te-combo"
      ) as HTMLSelectElement;

      if (select) {
        select.value = lang;
        select.dispatchEvent(new Event("change"));
      }
    };

    const inist = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: defaultLang,
          autoDisplay: false,
        },
        "google_translate_element"
      );

      // wait a moment for DOM injection
      setTimeout(() => applyLanguage(initialLang), 500);
    };

    const init = () => {
      if (!(window as any).google?.translate) return;

      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: defaultLang,
          autoDisplay: false,
        },
        "google_translate_element"
      );

      setTimeout(() => applyLanguage(initialLang), 500);
    };

    (window as any).googleTranslateElementInit = init;

    if (!document.querySelector("#google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else {
    // script already exists, wait until google is ready
    if ((window as any).google?.translate) {
      init();
    } else {
      (window as any).googleTranslateElementInit = init;
    }
  }
  }, [defaultLang]);
}