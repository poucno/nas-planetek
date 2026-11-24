import type { HistoryQuestion } from "./db/schema.js";
import { distanceInKilometers, MAX_POINTS, type Correctness, type LngLat } from "./scoring.js";

export type HistorySource = { title: string; url: string };
type HistoryOption = { id: string; label: string };

export type HistoryQuestionData =
  | {
      kind: "location";
      coordinates: LngLat;
      fullRadiusKm: number;
      outerRadiusKm: number;
      reference: string;
    }
  | { kind: "participants"; options: HistoryOption[]; correctOptionIds: string[] };

export type HistoryAnswer =
  | { kind: "location"; coordinates: LngLat }
  | { kind: "participants"; optionIds: string[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isHistoryEra = (value: unknown) => value === "ww1" || value === "ww2";

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

export const parseHistoryAnswer = (value: unknown): HistoryAnswer | null => {
  if (!isRecord(value)) return null;

  if (value.kind === "location" && isRecord(value.coordinates)) {
    const { lng, lat } = value.coordinates;
    if (isCoordinate(lng, 180) && isCoordinate(lat, 90)) {
      return { kind: "location", coordinates: { lng, lat } };
    }
  }

  if (value.kind === "participants" && Array.isArray(value.optionIds)) {
    const ids: unknown[] = value.optionIds;
    if (
      ids.length > 0 &&
      ids.every((id): id is string => typeof id === "string" && id.length > 0) &&
      new Set(ids).size === ids.length
    ) {
      return { kind: "participants", optionIds: ids };
    }
  }

  return null;
};

export const pointsForBattleDistance = (distanceKm: number, fullRadiusKm: number, outerRadiusKm: number) => {
  if (distanceKm <= fullRadiusKm) return MAX_POINTS;
  if (distanceKm >= outerRadiusKm) return 0;
  const points = Math.round(MAX_POINTS * (outerRadiusKm - distanceKm) / (outerRadiusKm - fullRadiusKm));
  return Math.min(MAX_POINTS - 1, Math.max(1, points));
};

const correctnessForPoints = (points: number): Correctness =>
  points === MAX_POINTS ? "yes" : points > 0 ? "partially" : "no";

// Vrste odmerimo ločeno in ohranimo naključni vrstni red iz poizvedbe.
export const makeHistoryRound = (shuffledQuestions: HistoryQuestion[]) => {
  const remaining = { location: 3, participants: 3 };
  const round = shuffledQuestions.filter(({ data }) => {
    if (remaining[data.kind] === 0) return false;
    remaining[data.kind] -= 1;
    return true;
  });

  if (remaining.location || remaining.participants) return [];

  return round.map(({ id, prompt, hint, period, data }) => {
    const question = { id, prompt, hint, period, kind: data.kind };
    return data.kind === "participants" ? { ...question, options: data.options } : question;
  });
};

export const gradeHistoryAnswer = (question: HistoryQuestion, answer: HistoryAnswer) => {
  const { data, answerLabel, explanation, sources } = question;
  const context = { answerLabel, explanation, sources };

  if (data.kind === "location" && answer.kind === "location") {
    const distanceKm = distanceInKilometers(answer.coordinates, data.coordinates);
    const points = pointsForBattleDistance(distanceKm, data.fullRadiusKm, data.outerRadiusKm);
    return { ...context, kind: data.kind, correctAnswer: data.coordinates, distanceKm, points, correctness: correctnessForPoints(points) };
  }

  if (data.kind === "participants" && answer.kind === "participants") {
    const availableIds = new Set(data.options.map(({ id }) => id));
    if (answer.optionIds.some((id) => !availableIds.has(id))) return null;
    const correctIds = new Set(data.correctOptionIds);
    const balance = answer.optionIds.reduce((sum, id) => sum + (correctIds.has(id) ? 1 : -1), 0);
    const points = Math.round(MAX_POINTS * Math.max(0, balance) / correctIds.size);
    return { ...context, kind: data.kind, correctAnswer: data.correctOptionIds, points, correctness: correctnessForPoints(points) };
  }

  return null;
};
