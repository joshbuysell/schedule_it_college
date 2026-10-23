import { getSettings, lessonsWhere } from "@/lib/queries";
import { computeWorkload } from "@/lib/workload";
import { workloadWorkbook } from "@/lib/excel";
import { xlsx } from "../xlsx";

export async function GET() {
  const [lessons, settings] = await Promise.all([lessonsWhere({}), getSettings()]);
  return xlsx(await workloadWorkbook(computeWorkload(lessons), settings.semesterLabel), `Навантаження ${settings.semesterLabel}.xlsx`);
}
