import { requestJson } from './api';
import type { HistoryAnswer, HistoryEra, HistoryFeedback, HistoryQuestion, LngLat } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isCoordinate = (value: unknown, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;

const isLngLat = (value: unknown): value is LngLat =>
  isRecord(value) && isCoordinate(value.lng, 180) && isCoordinate(value.lat, 90);

const isHistoryQuestion = (value: unknown): value is HistoryQuestion =>
  isRecord(value) &&
  typeof value.id === 'number' && Number.isInteger(value.id) &&
  typeof value.prompt === 'string' && typeof value.hint === 'string' && typeof value.period === 'string' &&
  (value.kind === 'location' ||
    (value.kind === 'participants' && Array.isArray(value.options) &&
      value.options.every((option: unknown) =>
        isRecord(option) && typeof option.id === 'string' && typeof option.label === 'string')));

const isHistoryFeedback = (value: unknown): value is HistoryFeedback =>
  isRecord(value) &&
  typeof value.points === 'number' && Number.isInteger(value.points) && value.points >= 0 && value.points <= 1000 &&
  (value.correctness === 'yes' || value.correctness === 'partially' || value.correctness === 'no') &&
  typeof value.answerLabel === 'string' && typeof value.explanation === 'string' &&
  Array.isArray(value.sources) && value.sources.every((source: unknown) =>
    isRecord(source) && typeof source.title === 'string' &&
    typeof source.url === 'string' && /^https:\/\//i.test(source.url)) &&
  ((value.kind === 'location' && isLngLat(value.correctAnswer) &&
    typeof value.distanceKm === 'number' && Number.isFinite(value.distanceKm) && value.distanceKm >= 0) ||
    (value.kind === 'participants' && Array.isArray(value.correctAnswer) &&
      value.correctAnswer.every((id: unknown) => typeof id === 'string')));

export const getHistoryQuestions = async (era: HistoryEra): Promise<HistoryQuestion[]> => {
  const data = await requestJson(`/history/questions?${new URLSearchParams({ era })}`);
  if (!Array.isArray(data) || !data.every(isHistoryQuestion)) {
    throw new TypeError('Strežnik je vrnil neveljavna zgodovinska vprašanja.');
  }
  return data;
};

export const checkHistoryAnswer = async (questionId: number, answer: HistoryAnswer): Promise<HistoryFeedback> => {
  const data = await requestJson('/history/questions/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, answer }),
  });
  if (!isHistoryFeedback(data) || data.kind !== answer.kind) {
    throw new TypeError('Strežnik je vrnil neveljavno oceno odgovora.');
  }
  return data;
};
