// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Configurações do WhatsApp
export const CONTACT_PHONE = "5579999365157";
export const PREMIUM_MESSAGE =
  "Fala Will! Quero liberar o acesso antecipado aos Grupos no Zibee.";

export const handleWhatsAppContact = () => {
  const url = `https://wa.me/${CONTACT_PHONE}?text=${encodeURIComponent(PREMIUM_MESSAGE)}`;
  window.open(url, "_blank");
};
