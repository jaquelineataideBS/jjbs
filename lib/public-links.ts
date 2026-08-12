export function whatsappHref(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}` : "/contato";
}

export function instagramHref(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  if (!text) return "/contato";
  if (/^https:\/\//i.test(text)) return text;
  return `https://instagram.com/${text.replace(/^@/, "")}`;
}
