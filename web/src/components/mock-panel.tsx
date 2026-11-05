"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { MOCK_SCENARIOS, getScenario, resetMockStore, setScenario, type MockScenario } from "@/lib/frontline/mock";

/** Visible only on mock builds: lets a reviewer flip every loading, error and empty state. */
export function MockPanel() {
  const [open, setOpen] = useState(false);
  const [scenario, setLocal] = useState<MockScenario>("normal");
  const qc = useQueryClient();

  useEffect(() => setLocal(getScenario()), []);

  const choose = (s: MockScenario) => {
    setScenario(s);
    setLocal(s);
    qc.invalidateQueries();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-72 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-lg">
          <p className="text-sm font-semibold">Mock data</p>
          <p className="mt-1 text-xs text-muted">Preview build. Pick a scenario to see each state; production always reads Mezo.</p>
          <fieldset className="mt-3 flex flex-col gap-1">
            <legend className="sr-only">Scenario</legend>
            {MOCK_SCENARIOS.map((s) => (
              <label key={s.id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="mock-scenario" checked={scenario === s.id} onChange={() => choose(s.id)} />
                {s.label}
              </label>
            ))}
          </fieldset>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="min-h-9 rounded-md border border-line-strong px-3 text-xs font-semibold"
              onClick={() => {
                resetMockStore();
                qc.invalidateQueries();
              }}
            >
              Reset data
            </button>
            <button type="button" className="min-h-9 rounded-md px-3 text-xs font-semibold text-muted" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-11 items-center gap-2 rounded-full border border-warning/40 bg-warning-soft px-4 text-xs font-semibold text-warning shadow"
        >
          <FlaskConical aria-hidden="true" size={14} /> Mock data · {MOCK_SCENARIOS.find((s) => s.id === scenario)?.label}
        </button>
      )}
    </div>
  );
}
