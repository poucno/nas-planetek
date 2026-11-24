import assert from "node:assert/strict";
import { test } from "node:test";
import { seedHistoryQuestions } from "./db/seedHistoryQuestions.js";
import { gradeHistoryAnswer, makeHistoryRound, parseHistoryAnswer, pointsForBattleDistance } from "./history.js";

test("battle location uses inclusive thresholds and bounded partial scores", () => {
  assert.equal(pointsForBattleDistance(0, 10, 60), 1000);
  assert.equal(pointsForBattleDistance(10, 10, 60), 1000);
  assert.equal(pointsForBattleDistance(10.01, 10, 60), 999);
  assert.equal(pointsForBattleDistance(35, 10, 60), 500);
  assert.equal(pointsForBattleDistance(59.999, 10, 60), 1);
  assert.equal(pointsForBattleDistance(60, 10, 60), 0);
  assert.equal(pointsForBattleDistance(61, 10, 60), 0);
});

test("invalid answer shapes are rejected", () => {
  for (const answer of [
    null,
    {},
    { kind: "other" },
    { kind: "location", coordinates: { lat: 91, lng: 0 } },
    { kind: "location", coordinates: { lat: 0, lng: Infinity } },
    { kind: "location", coordinates: { lat: 0, lng: "0" } },
    { kind: "participants", optionIds: [] },
    { kind: "participants", optionIds: ["one", "one"] },
    { kind: "participants", optionIds: [""] },
    { kind: "participants", optionIds: [1] },
  ]) {
    assert.equal(parseHistoryAnswer(answer), null);
  }
});

test("seed questions have valid answers, sources and sufficient distractors", () => {
  assert.equal(new Set(seedHistoryQuestions.map(({ id }) => id)).size, seedHistoryQuestions.length);

  for (const question of seedHistoryQuestions) {
    const { data, sources } = question;
    assert.ok(sources.length > 0 && sources.every(({ url }) => new URL(url).protocol === "https:"));
    if (data.kind === "location") {
      const answer = { kind: "location", coordinates: data.coordinates } as const;
      assert.deepEqual(parseHistoryAnswer(answer), answer);
      assert.ok(data.outerRadiusKm > data.fullRadiusKm && data.fullRadiusKm > 0);
      const result = gradeHistoryAnswer(question, answer);
      assert.equal(result?.kind, "location");
      assert.equal(result?.distanceKm, 0);
      assert.equal(result?.points, 1000);
      assert.equal(result?.correctness, "yes");
    } else {
      const ids = data.options.map(({ id }) => id);
      const correct = new Set(data.correctOptionIds);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(correct.size, data.correctOptionIds.length);
      assert.ok(correct.size >= 2 && data.correctOptionIds.every((id) => ids.includes(id)));
      assert.ok(ids.length >= correct.size * 2);

      const grade = (optionIds: string[]) => gradeHistoryAnswer(question, { kind: "participants", optionIds });
      const correctId = data.correctOptionIds[0];
      const wrongId = ids.find((id) => !correct.has(id))!;
      assert.equal(grade(data.correctOptionIds)?.points, 1000);
      assert.equal(grade([correctId])?.points, Math.round(1000 / correct.size));
      assert.equal(grade([correctId])?.correctness, "partially");
      assert.equal(grade([correctId, wrongId])?.points, 0);
      assert.equal(grade(ids)?.correctness, "no");
      assert.equal(grade(ids)?.points, 0);
      assert.equal(grade(["unknown"]), null);
      assert.equal(gradeHistoryAnswer(question, { kind: "location", coordinates: { lat: 0, lng: 0 } }), null);
    }
  }
});

test("a round contains three questions per kind without answer data", () => {
  for (const era of ["ww1", "ww2"]) {
    const available = seedHistoryQuestions.filter((question) => question.era === era);
    const shuffled = [...available].reverse();
    const round = makeHistoryRound(shuffled);
    assert.deepEqual(round.map(({ id }) => id), shuffled.map(({ id }) => id));
    assert.equal(new Set(round.map(({ id }) => id)).size, 6);
    assert.equal(round.filter(({ kind }) => kind === "location").length, 3);
    assert.equal(round.filter(({ kind }) => kind === "participants").length, 3);
    for (const question of round) {
      const publicKeys = ["hint", "id", "kind", "period", "prompt"];
      if (question.kind === "participants") publicKeys.push("options");
      assert.deepEqual(Object.keys(question).sort(), publicKeys.sort());
    }
    assert.deepEqual(makeHistoryRound(shuffled.slice(1)), []);
  }
});
