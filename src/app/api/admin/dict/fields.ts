import { z } from "zod";

const opt = z.string().trim().max(160).nullish().transform((v) => v || null);

/** Дозволені поля для кожного довідника. */
export const DICT = {
  teachers: { model: "teacher", schema: z.object({ shortName: z.string().trim().min(3).max(60), fullName: opt, commission: opt, degree: opt }) },
  subjects: { model: "subject", schema: z.object({ name: z.string().trim().min(2).max(120) }) },
  rooms: { model: "room", schema: z.object({ name: z.string().trim().min(1).max(20), shared: z.boolean().default(false) }) },
  groups: {
    model: "group",
    schema: z.object({
      name: z.string().trim().min(3).max(20),
      course: z.number().int().min(1).max(4),
      specialty: z.string().trim().min(2).max(120),
    }),
  },
} as const;

export type DictKind = keyof typeof DICT;
export const isDictKind = (k: string): k is DictKind => k in DICT;
