import type { Metadata, Viewport } from "next";
import QRCode from "qrcode";
import { getChanges, getRoomOccupancy, getToday } from "@/lib/queries";
import { publicUrl } from "@/lib/publicUrl";
import { addDays, weekdayOf } from "@/lib/schedule";
import Board from "./Board";

export const metadata: Metadata = { title: "Табло", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#1d2260" };
export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const today = await getToday();
  let next = addDays(today.ymd, 1);
  while (weekdayOf(next) > 5) next = addDays(next, 1);

  const [changes, occupancy, url] = await Promise.all([
    getChanges({ status: "approved", date: { in: [today.ymd, next] } }),
    getRoomOccupancy(today.ymd),
    publicUrl(),
  ]);
  const rooms = occupancy.rooms.filter((r) => !r.shared);
  const free = Object.fromEntries(today.bells.map((b) => [b.pair, rooms.filter((r) => !occupancy.busy.has(`${r.id}:${b.pair}`)).map((r) => r.name)]));
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1d2260", light: "#ffffff" } });

  return (
    <Board
      today={today.ymd}
      next={next}
      parity={today.parity}
      semester={today.settings.semesterLabel}
      bells={today.bells}
      changes={changes}
      free={free}
      roomsTotal={rooms.length}
      url={url.replace(/^https?:\/\//, "")}
      qr={qr}
    />
  );
}
