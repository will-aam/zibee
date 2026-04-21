// lib/fonts.ts
import { Sora, Audiowide } from "next/font/google";

export const sora = Sora({
  subsets: ["latin"],
  display: "swap", // Boa prática para performance
});

export const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
