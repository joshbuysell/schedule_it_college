"use client";

import { Printer } from "lucide-react";
import { actionClass } from "./ui";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className={actionClass}
    >
      <Printer className="size-4" /> Друк
    </button>
  );
}
