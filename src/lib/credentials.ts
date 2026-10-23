import { randomInt } from "node:crypto";

const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", "'": "", "ʼ": "", "’": "",
};

export function latin(text: string) {
  return [...text.toLowerCase()].map((c) => MAP[c] ?? c).join("");
}

export function loginFor(shortName: string) {
  const [surname, initials = ""] = shortName.split(" ");
  const letters = initials.replace(/[^\p{L}]/gu, "");
  return [latin(surname), latin(letters)].filter(Boolean).join(".").replace(/[^a-z.]/g, "");
}

export function generatePassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}
