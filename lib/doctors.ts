// Display helpers for the doctor card on the booking page.

// The one place to change the currency label shown next to a consultation fee.
export const FEE_CURRENCY = "UZS";

/** "150,000 UZS" ("Free" for 0); null when the doctor has no price set. */
export const formatFee = (fee: unknown): string | null => {
  if (fee === null || fee === undefined || fee === "") return null;
  const amount = Number(fee);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount === 0 ? "Free" : `${amount.toLocaleString("en-US")} ${FEE_CURRENCY}`;
};

// The doctors.consultation_fee column is a Postgres INTEGER.
const MAX_FEE = 2147483647;

/**
 * Reads the fee field of the doctor forms: "" → null (no price), "150000" →
 * 150000, and anything the server would refuse (negative, fractional, text,
 * too large for the column) → undefined, so the form can say so up front.
 */
export const parseFeeInput = (text: string): number | null | undefined => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const amount = Number(trimmed);
  return Number.isSafeInteger(amount) && amount <= MAX_FEE ? amount : undefined;
};

/**
 * Experience text for the card, or null when there is nothing worth showing.
 * The admin form stores ranges ("5-10 year", "6-12 months", "No experience")
 * while the doctor onboarding page can store a bare number ("5"), and rows
 * created before either existed hold the model default "no experience".
 */
export const formatExperience = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  if (!text || /^no experience$/i.test(text)) return null;
  if (/^\d+$/.test(text)) {
    const years = Number(text);
    return years === 0 ? null : `${years} ${years === 1 ? "year" : "years"}`;
  }
  return text.replace(/\byear\b/gi, "years");
};

/** The doctor's short bio, whitespace-collapsed; null when empty. */
export const formatBio = (value: unknown): string | null => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
};
