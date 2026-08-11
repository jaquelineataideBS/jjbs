function localWhatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits.slice(0, 11);
}

export function formatWhatsapp(value: string) {
  const digits = localWhatsappDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${areaCode}) ${number}`;

  const splitAt = number.length > 8 ? 5 : 4;
  return `(${areaCode}) ${number.slice(0, splitAt)}-${number.slice(splitAt)}`;
}

export function normalizeWhatsapp(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = localWhatsappDigits(value.trim());
  if (digits.length !== 10 && digits.length !== 11) return null;
  return formatWhatsapp(digits);
}
