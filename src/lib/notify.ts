import "server-only";
import type { ChangeDTO } from "./changes";
import { notifyChanges as telegram } from "./telegram";

export async function notifyChanges(changes: ChangeDTO[]) {
  await telegram(changes).catch((e) => console.error("telegram notify", e));
}
