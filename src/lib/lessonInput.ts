import { z } from "zod";

export const lessonInput = z.object({
  groupId: z.number().int().positive(),
  day: z.number().int().min(1).max(5),
  pair: z.number().int().min(1).max(6),
  week: z.enum(["all", "num", "den"]).default("all"),
  subgroup: z.number().int().min(0).max(2).default(0),
  subject: z.string().trim().min(1, "Вкажіть дисципліну").max(120),
  teacher: z.string().trim().max(80).nullish(),
  room: z.string().trim().max(20).nullish(),
});

export type LessonInput = z.infer<typeof lessonInput>;
