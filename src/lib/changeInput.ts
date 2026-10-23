import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата у форматі YYYY-MM-DD");

export const changeInput = z
  .object({
    date: ymd,
    groupId: z.number().int().positive(),
    pair: z.number().int().min(1).max(6),
    subgroup: z.number().int().min(0).max(2).default(0),
    cancelled: z.boolean().default(false),
    subject: z.string().trim().max(120).nullish(),
    teacher: z.string().trim().max(80).nullish(),
    room: z.string().trim().max(20).nullish(),
    note: z.string().trim().max(200).nullish(),
  })
  .refine((c) => c.cancelled || !!c.subject, { message: "Вкажіть дисципліну", path: ["subject"] });

export type ChangeInput = z.infer<typeof changeInput>;

export const teacherRequest = z.object({
  date: ymd,
  groupId: z.number().int().positive(),
  pair: z.number().int().min(1).max(6),
  subgroup: z.number().int().min(0).max(2).default(0),
  kind: z.enum(["cancel", "room", "substitute"]),
  room: z.string().trim().max(20).nullish(),
  note: z.string().trim().max(200).nullish(),
});

export const absenceRequest = z.object({ date: ymd, note: z.string().trim().max(200).nullish() });
