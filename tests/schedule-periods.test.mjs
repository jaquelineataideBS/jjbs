import test from "node:test";
import assert from "node:assert/strict";
import { buildAvailableSlots, hasOverlappingRanges } from "../lib/scheduling.ts";

test("aceita períodos separados no mesmo dia", () => {
  assert.equal(hasOverlappingRanges([
    { startTime: "08:00", endTime: "12:00" },
    { startTime: "14:00", endTime: "18:00" },
  ]), false);
});

test("rejeita períodos de trabalho sobrepostos", () => {
  assert.equal(hasOverlappingRanges([
    { startTime: "08:00", endTime: "13:00" },
    { startTime: "12:00", endTime: "18:00" },
  ]), true);
});

test("gera horários somente dentro de cada período informado", () => {
  const morning = buildAvailableSlots({ startTime: "08:00", endTime: "10:00", breakStart: null, breakEnd: null }, 60, []);
  const afternoon = buildAvailableSlots({ startTime: "14:00", endTime: "16:00", breakStart: null, breakEnd: null }, 60, []);
  assert.deepEqual([...morning, ...afternoon], ["08:00", "08:30", "09:00", "14:00", "14:30", "15:00"]);
});
