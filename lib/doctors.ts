export const FEE_CURRENCY = "UZS";

export const formatFee = (fee: unknown): string | null => {
  if (fee === null || fee === undefined || fee === "") return null;
  const amount = Number(fee);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount === 0 ? "Free" : `${amount.toLocaleString("en-US")} ${FEE_CURRENCY}`;
};

const MAX_FEE = 2147483647;

export const parseFeeInput = (text: string): number | null | undefined => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const amount = Number(trimmed);
  return Number.isSafeInteger(amount) && amount <= MAX_FEE ? amount : undefined;
};

export const formatExperience = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  if (!text || /^no experience$/i.test(text)) return null;
  if (/^\d+$/.test(text)) {
    const years = Number(text);
    return years === 0 ? null : `${years} ${years === 1 ? "year" : "years"}`;
  }
  return text.replace(/\byear\b/gi, "years");
};

export const formatBio = (value: unknown): string | null => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
};
