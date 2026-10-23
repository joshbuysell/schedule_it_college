import { z } from "zod";

export const practiceInput = z.object({
  groupId: z.number().int().positive(),
  semesterId: z.number().int().positive().optional(),
  title: z.string().trim().min(2).max(160),
  dates: z.string().trim().min(3).max(60),
  teachers: z.string().trim().max(200).default(""),
});
