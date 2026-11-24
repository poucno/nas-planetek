import { useReducer } from "react";
import type { QuestionFeedback } from "@meridiani/components";
import { QuestionType, type CountryGuessQuestion, type HistoryFeedback, type HistoryQuestion, type LngLat, type Question } from "@/api/types";
import type { EuropeMapDisplay } from "@meridiani/components";
import { gameText } from "./gameText";

export const HISTORY_MODE = {
  id: 4,
  kind: "history",
  name: gameText.history.name,
  description: gameText.history.description,
  icon: gameText.history.icon,
  display: { hideModernPolitics: true },
} as const;

export const GAME_MODES = [
  {
    id: 1,
    kind: "map",
    ...gameText.modes.capitalCities,
    type: QuestionType.CITIES,
    display: { country: true },
  },
  {
    id: 2,
    kind: "map",
    ...gameText.modes.countriesAndRegions,
    type: QuestionType.COUNTRIES,
    display: { city: true },
  },
  {
    id: 3,
    kind: "countryGuess",
    ...gameText.modes.guessCountry,
    display: {},
  },
  HISTORY_MODE,
] satisfies ({
  id: number;
  name: string;
  description: string;
  icon: string;
  display: EuropeMapDisplay;
} & ({ kind: "map"; type: QuestionType } | { kind: "countryGuess" | "history" }))[];

export type GameMode = (typeof GAME_MODES)[number];
export type GamePhase = "ready" | "selecting" | "started" | "paused" | "completed";

export type QuestionResult = {
  prompt: string;
  submittedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  quality: 'good' | 'medium' | 'bad';
  distanceKm?: number;
};

export type GameData = {
  phase: GamePhase;
  activeMode: GameMode | null;
  questions: (Question | CountryGuessQuestion | HistoryQuestion)[];
  points: number;
  correctAnswers: number;
  questionResults: QuestionResult[];
  answerFeedbacks: QuestionFeedback[];
  selectedAnswer: string | null;
  selectedCoordinates: LngLat | null;
  selectedHistoryOptions: string[];
  historyFeedback: HistoryFeedback | null;
  questionIndex: number;
  loadingModeId: number | null;
  error: string | null;
  elapsedMs: number;
  countryGuessGameId: string | null;
};

export type GameAction =
  | { type: "reset"; phase: GamePhase }
  | { type: "phase"; phase: GamePhase }
  | { type: "error"; message: string | null }
  | { type: "loading"; modeId: number | null }
  | { type: "modeLoaded"; mode: GameMode; questions: GameData["questions"]; countryGuessGameId?: string }
  | { type: "selectAnswer"; coordinates: LngLat; answer: string }
  | { type: "toggleHistoryOption"; optionId: string }
  | {
      type: "submitAnswer";
      result: QuestionResult;
      feedback: QuestionFeedback;
      historyFeedback?: HistoryFeedback;
    }
  | { type: "wrongGuess"; answer: string }
  | { type: "tick"; milliseconds: number }
  | {
      type: "countryGuessFinished";
      hits: number;
      elapsedMs: number;
      questionResults: QuestionResult[];
    }
  | { type: "nextQuestion" };

export const initialGameData = (phase: GamePhase = "ready"): GameData => ({
  phase,
  activeMode: null,
  questions: [],
  points: 0,
  correctAnswers: 0,
  questionResults: [],
  answerFeedbacks: [],
  selectedAnswer: null,
  selectedCoordinates: null,
  selectedHistoryOptions: [],
  historyFeedback: null,
  questionIndex: 0,
  loadingModeId: null,
  error: null,
  elapsedMs: 0,
  countryGuessGameId: null,
});

export const gameReducer = (state: GameData, action: GameAction): GameData => {
  switch (action.type) {
    case "reset":
      return initialGameData(action.phase);
    case "phase":
      if (action.phase === "completed" && state.activeMode?.kind === "history") {
        return {
          ...state,
          phase: action.phase,
          selectedCoordinates: null,
          selectedAnswer: null,
          selectedHistoryOptions: [],
          historyFeedback: null,
        };
      }
      return { ...state, phase: action.phase };
    case "error":
      return { ...state, error: action.message };
    case "loading":
      return { ...state, loadingModeId: action.modeId };
    case "modeLoaded":
      return {
        ...state,
        phase: "started",
        activeMode: action.mode,
        questions: action.questions,
        countryGuessGameId: action.countryGuessGameId ?? null,
      };
    case "selectAnswer":
      return {
        ...state,
        selectedCoordinates: action.coordinates,
        selectedAnswer: action.answer,
      };
    case "toggleHistoryOption":
      return {
        ...state,
        selectedHistoryOptions: state.selectedHistoryOptions.includes(action.optionId)
          ? state.selectedHistoryOptions.filter((id) => id !== action.optionId)
          : [...state.selectedHistoryOptions, action.optionId],
      };
    case "submitAnswer":
      return {
        ...state,
        questionResults: [...state.questionResults, action.result],
        answerFeedbacks: [...state.answerFeedbacks, action.feedback],
        historyFeedback: action.historyFeedback ?? null,
        points: state.points + action.result.pointsEarned,
        correctAnswers:
          state.correctAnswers + Number(action.result.isCorrect),
      };
    case "wrongGuess":
      return { ...state, selectedAnswer: action.answer };
    case "tick":
      return { ...state, elapsedMs: state.elapsedMs + action.milliseconds };
    case "countryGuessFinished":
      return {
        ...state,
        phase: "completed",
        points: action.hits,
        correctAnswers: action.hits,
        elapsedMs: action.elapsedMs,
        questionResults: action.questionResults,
      };
    case "nextQuestion":
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        selectedAnswer: null,
        selectedCoordinates: null,
        selectedHistoryOptions: [],
        historyFeedback: null,
      };
  }
};

export function useGame() {
  return useReducer(gameReducer, initialGameData());
}
