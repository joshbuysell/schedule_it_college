import { templateWorkbook } from "@/lib/excel";
import { xlsx } from "../xlsx";

export async function GET() {
  return xlsx(await templateWorkbook(), "Шаблон розкладу.xlsx");
}
