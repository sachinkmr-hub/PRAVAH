import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIntelligence,
  classifyUrgency,
  historicalMatch,
  normalizeEvent,
  type CanonicalEvent,
} from "./simulation-engine.ts";

function event(overrides: Partial<CanonicalEvent> = {}): CanonicalEvent {
  return {
    id: "event-1",
    eventType: "UNPLANNED",
    cause: "ACCIDENT",
    address: "Outer Ring Road, Bengaluru",
    corridor: "ORR East",
    junction: "Bellandur Junction",
    latitude: 12.93,
    longitude: 77.68,
    startMs: Date.parse("2024-03-25T03:30:00Z"),
    endMs: Date.parse("2024-03-25T05:30:00Z"),
    startDatetime: "2024-03-25T03:30:00.000Z",
    endDatetime: "2024-03-25T05:30:00.000Z",
    durationMinutes: 120,
    severe: true,
    requiresRoadClosure: true,
    status: "OPEN",
    paradigm: "REACTIVE",
    dashCategory: "incidents",
    ...overrides,
  };
}

test("normalization rejects invalid coordinates instead of poisoning aggregates", () => {
  const result = normalizeEvent({ id: "bad", latitude: "NaN", longitude: "77", start_datetime: "2024-01-01T00:00:00Z" });
  assert.match(result.error ?? "", /latitude/);
  assert.equal(result.event, undefined);
});

test("urgency uses interval overlap", () => {
  const item = event();
  assert.equal(classifyUrgency(item, Date.parse("2024-03-25T04:00:00Z")), "CURRENT");
  assert.equal(classifyUrgency(item, Date.parse("2024-03-20T04:00:00Z")), "IMMINENT");
});

test("historical frequency uses real spatial matches", () => {
  const current = event();
  const nearby = event({ id: "past-near", startMs: Date.parse("2024-02-01T00:00:00Z"), latitude: 12.9305 });
  const far = event({ id: "past-far", startMs: Date.parse("2024-02-01T00:00:00Z"), latitude: 13.1 });
  assert.equal(historicalMatch(current, [nearby, far], 0.5).count, 1);
});

test("intelligence is deterministic, bounded, and carries governance metadata", () => {
  const item = event();
  const config = { nowMs: Date.parse("2024-03-25T04:00:00Z"), historicalRadiusKm: 0.5, imminentHours: 168, seed: "test-seed" };
  const first = buildIntelligence(item, [], config);
  const second = buildIntelligence(item, [], config);
  assert.deepEqual(first, second);
  assert.ok(first.lane_blockage_instructions.lanes_to_close <= first.lane_blockage_instructions.total_lanes);
  assert.equal(first.decision_metadata.mode, "SIMULATION");
  assert.equal(first.decision_metadata.requires_human_approval, true);
  assert.ok(first.kinematic_state.residual_capacity_vph >= 0);
});
