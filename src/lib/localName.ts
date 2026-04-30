import i18n from "@/lib/i18n";

/**
 * Returns the localized name of a DB entity based on current language.
 * Falls back to the default `name` field if no translation exists.
 */
export function localName(item: { name: string; name_ar?: string | null; name_en?: string | null } | null | undefined): string {
  if (!item) return "";
  const lang = i18n.language;
  if (lang === "ar" && item.name_ar) return item.name_ar;
  if (lang === "en" && item.name_en) return item.name_en;
  return item.name;
}
