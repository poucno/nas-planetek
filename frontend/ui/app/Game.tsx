'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  EuropeMapClickEvent,
  EuropeMapDisplay,
  EuropeMapRefHandle,
  QuestionFeedback,
} from '@meridiani/components';
import {
  Card,
  CardsModal,
  CountryGuessPanel,
  EuropeMap,
  FloatingPanel,
  GameButton,
  GameplayInstructions,
  Leaderboards,
  LoadingSpinner,
  Overlay,
  PlayerScore,
  QuestionPanel,
  ResultSummary,
} from '@meridiani/components';
import type {
  LeaderboardContent,
  LeaderboardEntry as ComponentLeaderboardEntry,
  ResultSummaryContent,
} from '@meridiani/components';
import { getBundledMapGeoData } from '@/api/apiGeoService';
import { ApiError } from '@/api/api';
import { checkHistoryAnswer, getHistoryQuestions } from '@/api/apiHistoryService';
import type { HistoryAnswer, HistoryEra } from '@/api/types';
import {
  checkCountryGuess,
  createCountryGuessGame,
  finishCountryGuessGame,
  pauseCountryGuessGame,
  resumeCountryGuessGame,
  skipCountry,
} from '@/service/countryGuessService';
import { getMapGeoData } from '@/service/geoService';
import { checkQuestionAnswer, getLeaderboard, getQuestionsForType } from '@/service/questionsService';
import { formatCoordinates, formatPlaceName, formatTime, gameText } from './gameText';
import { GAME_MODES, HISTORY_MODE, type GameMode, type GamePhase, type QuestionResult, useGame } from './useGame';
import { useAuth } from './useAuth';
import AccountControls from './AccountControls';
import AppLoadingSpinner from './AppLoadingSpinner';
import AuthDialog from './AuthDialog';
import HistoryQuestionPanel from './HistoryQuestionPanel';
import PointsAward from './PointsAward';
import styles from './page.module.css';

import { LngLat as MapLngLat, Marker, setWorkerUrl } from 'maplibre-gl';
setWorkerUrl('maplibre-gl-worker.mjs');

const LEADERBOARD_CONTENT: LeaderboardContent = {
  ...gameText.leaderboard,
};

const RESULT_SUMMARY_CONTENT: ResultSummaryContent = {
  ...gameText.results,
  correctAnswerLabel: (answer) => gameText.results.correctAnswerLabel(String(answer)),
};
const COUNTRY_GUESS_SUMMARY_CONTENT: ResultSummaryContent = {
  ...RESULT_SUMMARY_CONTENT,
  ...gameText.countryGuess.results,
};
// Lestvice so po točkah, igra Ugotovi državo pa za zdaj rezultatov še ne shranjuje
const LEADERBOARD_TABS = GAME_MODES.filter((mode) => mode.kind === 'map').map(({ id, name }) => ({
  id: String(id),
  label: name,
}));

const maxPointsPerQuestion = 1000;
const pointsPerCountryHit = 1;
const STOPWATCH_INTERVAL_MS = 100;
const DEFAULT_DISPLAY: EuropeMapDisplay = { country: true };
const HISTORY_ERAS: HistoryEra[] = ['ww1', 'ww2'];

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : gameText.errors.unknown);
const historyErrorMessage = (error: unknown) => error instanceof ApiError ? error.message : gameText.history.retry;

function Game() {
  const [game, dispatch] = useGame();
  const auth = useAuth();
  const currentPlayer = auth.user?.username ?? gameText.playerName;
  const mapRef = useRef<EuropeMapRefHandle>(null);
  const gameStateRef = useRef(game.phase);
  const selectedMarker = useRef<Marker | null>(null);
  const checkingAnswer = useRef(false);
  const modeRequestId = useRef(0);
  const answerRequestId = useRef(0);
  const [geojson, setGeojson] = useState(getBundledMapGeoData);
  const [mapDataVersion, setMapDataVersion] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChoosingHistoryEra, setIsChoosingHistoryEra] = useState(false);
  const [isHistorySubmitting, setIsHistorySubmitting] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{
    modeId: number;
    entries: ComponentLeaderboardEntry[];
  } | null>(null);
  const [leaderboardModeId, setLeaderboardModeId] = useState(GAME_MODES[0].id);
  const [loadingLeaderboardModeId, setLoadingLeaderboardModeId] = useState<
    number | null
  >(GAME_MODES[0].id);
  const leaderboardRequestId = useRef(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const gameState = game.phase;
  const display = game.activeMode?.display ?? DEFAULT_DISPLAY;
  const leaderboards =
    leaderboardData?.modeId === leaderboardModeId
      ? leaderboardData.entries
      : [];
  const isLoadingLeaderboards =
    loadingLeaderboardModeId === leaderboardModeId;
  const activeLeaderboardError =
    loadingLeaderboardModeId === null ? leaderboardError : null;
  const currentQuestion = game.questions[game.questionIndex];
  const isAnswerSubmitted = game.questionResults[game.questionIndex] !== undefined;
  const feedback = game.answerFeedbacks[game.questionIndex];
  const isQuizComplete = game.phase === 'completed';
  const isPaused = game.phase === 'paused';
  const isModalOpen = game.phase === 'selecting' || isPaused;
  const isCountryGuess = game.activeMode?.kind === 'countryGuess';
  const isHistory = game.activeMode?.kind === 'history';
  const historyQuestion = isHistory && currentQuestion && 'kind' in currentQuestion ? currentQuestion : null;
  const isCountryGuessRunning = isCountryGuess && game.phase === 'started';
  const highlightedCountries =
    (isCountryGuessRunning || (isCountryGuess && isPaused)) && currentQuestion && 'mapCountries' in currentQuestion
      ? currentQuestion.mapCountries
      : null;
  const lastResult = game.questionResults[game.questionResults.length - 1];
  const notices = [mapError, activeLeaderboardError, game.error].filter(
    (notice): notice is string => notice !== null,
  );

  useEffect(() => {
    gameStateRef.current = game.phase;
  }, [game.phase]);

  const clearMap = () => {
    selectedMarker.current = null;
    mapRef.current?.clear();
  };

  const resetGame = (phase: GamePhase) => {
    modeRequestId.current += 1;
    answerRequestId.current += 1;
    checkingAnswer.current = false;
    setIsHistorySubmitting(false);
    clearMap();
    dispatch({ type: 'reset', phase });
  };

  const start = () => {
    dispatch({ type: 'error', message: null });
    dispatch({ type: 'phase', phase: 'selecting' });
  };

  const back = () => {
    resetGame(isChoosingHistoryEra ? 'selecting' : 'ready');
    setIsChoosingHistoryEra(false);
  };
  const stop = () => {
    if (isCountryGuess) {
      void finishCountryGuess();
      return;
    }
    resetGame('ready');
  };
  const newGame = () => resetGame('selecting');
  const pause = async () => {
    dispatch({ type: 'phase', phase: 'paused' });
    if (!game.countryGuessGameId) return;
    try {
      await pauseCountryGuessGame(game.countryGuessGameId);
    } catch (error) {
      dispatch({ type: 'error', message: gameText.errors.updateGame(errorMessage(error)) });
    }
  };
  const resume = async () => {
    try {
      if (game.countryGuessGameId) {
        await resumeCountryGuessGame(game.countryGuessGameId);
      }
      dispatch({ type: 'error', message: null });
      dispatch({ type: 'phase', phase: 'started' });
    } catch (error) {
      dispatch({ type: 'error', message: gameText.errors.updateGame(errorMessage(error)) });
    }
  };

  const selectMode = async (mode: GameMode, era?: HistoryEra) => {
    resetGame('selecting');
    if (mode.kind === 'history' && !era) {
      setIsChoosingHistoryEra(true);
      return;
    }
    const requestId = ++modeRequestId.current;
    dispatch({ type: 'loading', modeId: mode.id });
    try {
      const countryGuessGame = mode.kind === 'countryGuess' ? await createCountryGuessGame() : null;
      const questions = era
        ? await getHistoryQuestions(era)
        : mode.kind === 'map' ? await getQuestionsForType(mode.type) : countryGuessGame?.questions ?? [];
      if (requestId !== modeRequestId.current) return;
      if (questions.length === 0) {
        dispatch({ type: 'error', message: era ? gameText.history.noQuestions : gameText.errors.noQuestions });
        return;
      }
      setIsChoosingHistoryEra(false);
      dispatch({ type: 'modeLoaded', mode, questions, countryGuessGameId: countryGuessGame?.id });
    } catch (error) {
      if (requestId === modeRequestId.current) {
        dispatch({
          type: 'error',
          message: gameText.errors.loadQuestions(era ? historyErrorMessage(error) : errorMessage(error)),
        });
      }
    } finally {
      if (requestId === modeRequestId.current) {
        dispatch({ type: 'loading', modeId: null });
      }
    }
  };

  const selectMapLocation = (data: EuropeMapClickEvent) => {
    if (game.phase !== 'started' || isCountryGuess || isAnswerSubmitted || checkingAnswer.current) {
      return;
    }
    if (isHistory && historyQuestion?.kind !== 'location') return;

    const point = isHistory ? data.lngLat.wrap() : data.lngLat;
    const coordinates = { lng: point.lng, lat: point.lat };
    const answer = isHistory ? formatCoordinates(coordinates) : formatPlaceName(data.city, data.country, coordinates);
    if (selectedMarker.current) {
      mapRef.current?.remove(selectedMarker.current);
    }
    selectedMarker.current = mapRef.current?.addMarker(point) ?? null;
    dispatch({ type: 'selectAnswer', coordinates, answer });
  };

  const submitAnswer = async (answer: string) => {
    if (
      game.phase !== 'started' ||
      !currentQuestion ||
      !('fact' in currentQuestion) ||
      !game.selectedCoordinates ||
      !answer ||
      isAnswerSubmitted ||
      checkingAnswer.current
    ) {
      return;
    }

    checkingAnswer.current = true;
    const requestId = ++answerRequestId.current;
    dispatch({ type: 'error', message: null });
    try {
      const result = await checkQuestionAnswer({
        questionId: currentQuestion.id,
        answer: game.selectedCoordinates,
      });
    if (requestId !== answerRequestId.current) return;

  const correctLocation = new MapLngLat(
    result.correctAnswer.lng,
    result.correctAnswer.lat,
  );

  const guessedLocation = selectedMarker.current?.getLngLat();

  if (guessedLocation) {
    mapRef.current?.addDottedLine(guessedLocation, correctLocation);
  }

  mapRef.current?.showAnswerLocation(correctLocation);
  mapRef.current?.addAnswerMarker(correctLocation);

  const distance = result.distanceKm;

  const distanceLabel =
    distance < 1
      ? `${Math.round(distance * 1000)} m`
      : `${Math.round(distance)} km`;

  const locationName =
    currentQuestion.locationName ??
    currentQuestion.prompt.replace(/^Poišči\s+/i, '').trim();

  mapRef.current?.addAnswerPopup(
    correctLocation,
    locationName,
    currentQuestion.fact,
    distanceLabel,
    result.correctness === 'yes'
      ? 'good'
      : result.correctness === 'partially'
        ? 'medium'
        : 'far',
  );

      const answerFeedback: QuestionFeedback =
        result.correctness === 'yes' ? 'correct' : result.correctness === 'partially' ? 'close' : 'incorrect';
      const questionResult: QuestionResult = {
        prompt: currentQuestion.prompt,
        submittedAnswer: answer,
        correctAnswer: formatCoordinates(result.correctAnswer),
        isCorrect: result.correctness === 'yes',
        pointsEarned: result.points,
        quality:
          result.correctness === 'yes'
            ? 'good'
            : result.correctness === 'partially'
              ? 'medium'
              : 'bad',
        distanceKm: result.distanceKm,
      };
      dispatch({
        type: 'submitAnswer',
        feedback: answerFeedback,
        result: questionResult,
      });
    } catch (error) {
      if (requestId === answerRequestId.current) {
        dispatch({
          type: 'error',
          message: gameText.errors.checkAnswer(errorMessage(error)),
        });
      }
    } finally {
      if (requestId === answerRequestId.current) {
        checkingAnswer.current = false;
      }
    }
  };

  const submitHistoryAnswer = async () => {
    if (game.phase !== 'started' || !historyQuestion || isAnswerSubmitted || checkingAnswer.current) return;

    let answer: HistoryAnswer;
    let submittedAnswer: string;
    if (historyQuestion.kind === 'location') {
      if (!game.selectedCoordinates) return;
      answer = { kind: 'location', coordinates: game.selectedCoordinates };
      submittedAnswer = formatCoordinates(game.selectedCoordinates);
    } else {
      if (game.selectedHistoryOptions.length === 0) return;
      answer = { kind: 'participants', optionIds: game.selectedHistoryOptions };
      submittedAnswer = historyQuestion.options
        .filter(({ id }) => game.selectedHistoryOptions.includes(id))
        .map(({ label }) => label)
        .join(', ');
    }

    checkingAnswer.current = true;
    setIsHistorySubmitting(true);
    const requestId = ++answerRequestId.current;
    dispatch({ type: 'error', message: null });
    try {
      const result = await checkHistoryAnswer(historyQuestion.id, answer);
      if (requestId !== answerRequestId.current) return;

      if (result.kind === 'location') {
        const correctLocation = new MapLngLat(result.correctAnswer.lng, result.correctAnswer.lat);
        const guessedLocation = selectedMarker.current?.getLngLat();
        if (guessedLocation) mapRef.current?.addDottedLine(guessedLocation, correctLocation);
        mapRef.current?.showAnswerLocation(correctLocation);
        mapRef.current?.addAnswerMarker(correctLocation);
      }

      const correct = result.correctness === 'yes';
      const partial = result.correctness === 'partially';
      dispatch({
        type: 'submitAnswer',
        feedback: correct ? 'correct' : partial ? 'close' : 'incorrect',
        historyFeedback: result,
        result: {
          prompt: historyQuestion.prompt,
          submittedAnswer,
          correctAnswer: result.answerLabel,
          isCorrect: correct,
          pointsEarned: result.points,
          quality: correct ? 'good' : partial ? 'medium' : 'bad',
          distanceKm: result.kind === 'location' ? result.distanceKm : undefined,
        },
      });
    } catch (error) {
      if (requestId === answerRequestId.current) {
        dispatch({ type: 'error', message: gameText.errors.checkAnswer(historyErrorMessage(error)) });
      }
    } finally {
      if (requestId === answerRequestId.current) {
        checkingAnswer.current = false;
        setIsHistorySubmitting(false);
      }
    }
  };

  const nextQuestion = () => {
    if (!isAnswerSubmitted || checkingAnswer.current) return;
    if (game.questionIndex === game.questions.length - 1) {
      if (isHistory) clearMap();
      dispatch({ type: 'phase', phase: 'completed' });
      return;
    }
    clearMap();
    dispatch({ type: 'nextQuestion' });
  };

  const showCountryGuessResult = async (gameId: string, requestId: number) => {
    const result = await finishCountryGuessGame(gameId);
    if (requestId !== answerRequestId.current) return;
    dispatch({
      type: 'countryGuessFinished',
      hits: result.hits,
      elapsedMs: result.elapsedMs,
      questionResults: result.rounds.map((round) => ({
        prompt: gameText.countryGuess.prompt,
        submittedAnswer: round.submittedAnswer
          ? gameText.countryGuess.submittedAnswer(round.submittedAnswer)
          : gameText.countryGuess.skippedAnswer,
        correctAnswer: round.correctAnswer,
        isCorrect: round.isCorrect,
        pointsEarned: round.isCorrect ? pointsPerCountryHit : 0,
        quality: round.isCorrect ? 'good' : 'bad',
      })),
    });
  };

  // Brez odgovora je to preskok države
  const answerCountryGuess = async (answer?: string) => {
    const gameId = game.countryGuessGameId;
    if (!isCountryGuessRunning || !gameId || !currentQuestion || checkingAnswer.current) return;

    checkingAnswer.current = true;
    const requestId = ++answerRequestId.current;
    dispatch({ type: 'error', message: null });
    try {
      const round = { gameId, questionId: currentQuestion.id };
      const result = answer ? await checkCountryGuess({ ...round, answer }) : await skipCountry(round);
      if (requestId !== answerRequestId.current) return;

      // Napačen poskus ne konča vprašanja; igralec lahko poskuša znova ali gre naprej
      if (answer && !result.isCorrect) {
        dispatch({ type: 'wrongGuess', answer });
        return;
      }

      dispatch({
        type: 'submitAnswer',
        feedback: result.isCorrect ? 'correct' : 'incorrect',
        result: {
          prompt: currentQuestion.prompt,
          submittedAnswer: answer ?? '',
          correctAnswer: result.correctAnswer ?? '',
          isCorrect: result.isCorrect,
          pointsEarned: result.isCorrect ? pointsPerCountryHit : 0,
          quality: result.isCorrect ? 'good' : 'bad',
        },
      });
      if (result.finished) {
        await showCountryGuessResult(gameId, requestId);
      } else {
        dispatch({ type: 'nextQuestion' });
      }
    } catch (error) {
      if (requestId === answerRequestId.current) {
        dispatch({
          type: 'error',
          message: gameText.errors.checkAnswer(errorMessage(error)),
        });
      }
    } finally {
      if (requestId === answerRequestId.current) {
        checkingAnswer.current = false;
      }
    }
  };

  const finishCountryGuess = async () => {
    const gameId = game.countryGuessGameId;
    if (!gameId || checkingAnswer.current) return;

    checkingAnswer.current = true;
    const requestId = ++answerRequestId.current;
    dispatch({ type: 'error', message: null });
    try {
      await showCountryGuessResult(gameId, requestId);
    } catch (error) {
      if (requestId === answerRequestId.current) {
        dispatch({
          type: 'error',
          message: gameText.errors.updateGame(errorMessage(error)),
        });
      }
    } finally {
      if (requestId === answerRequestId.current) {
        checkingAnswer.current = false;
      }
    }
  };

  useEffect(() => {
    if (!isCountryGuessRunning) return;
    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      dispatch({ type: 'tick', milliseconds: now - lastTick });
      lastTick = now;
    }, STOPWATCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isCountryGuessRunning, dispatch]);

  useEffect(() => {
    mapRef.current?.highlightCountries(highlightedCountries);
  }, [highlightedCountries]);

  useEffect(() => {
    const controller = new AbortController();
    void getMapGeoData(controller.signal)
      .then((mapData) => {
        if (gameStateRef.current !== 'ready' || mapData === getBundledMapGeoData()) {
          return;
        }
        setIsMapLoaded(false);
        setGeojson(mapData);
        setMapDataVersion((version) => version + 1);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMapError(gameText.errors.mapApiFallback(errorMessage(error)));
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const requestId = ++leaderboardRequestId.current;

    void getLeaderboard(leaderboardModeId)
      .then((entries) => {
        if (requestId === leaderboardRequestId.current) {
          setLeaderboardData({ modeId: leaderboardModeId, entries });
        }
      })
      .catch((error: unknown) => {
        if (requestId === leaderboardRequestId.current) {
          setLeaderboardError(
            gameText.errors.leaderboardUnavailable(errorMessage(error)),
          );
        }
      })
      .finally(() => {
        if (requestId === leaderboardRequestId.current) {
          setLoadingLeaderboardModeId(null);
        }
      });

    return () => {
      if (requestId === leaderboardRequestId.current) {
        leaderboardRequestId.current += 1;
      }
    };
  }, [leaderboardModeId]);

  const selectLeaderboardMode = (tabId: string) => {
    const modeId = Number(tabId);
    if (modeId === leaderboardModeId) return;
    setLeaderboardModeId(modeId);
    setLoadingLeaderboardModeId(modeId);
    setLeaderboardError(null);
  };

  return (
    <main className={styles.shell}>
      <div className={styles.map}>
        <EuropeMap
          key={mapDataVersion}
          ref={mapRef}
          geojson={geojson}
          display={display}
          style={{ width: '100vw', height: '100vh' }}
          onClick={selectMapLocation}
          onLoaded={() => setIsMapLoaded(true)}
        />
      </div>
      {gameState !== 'started' && (
        <Overlay blur className={styles.mapBlurOverlay}>
          {gameState === 'ready' && !isHelpOpen && (
            <div className={styles.startButton}>
              <GameButton
                type="start"
                disabled={!isMapLoaded}
                onClick={() => {
                  setIsHelpOpen(false);
                  start();
                }}
              />
              {!isMapLoaded && (
                <LoadingSpinner
                  className={styles.startSpinner}
                  role="status"
                  aria-label={gameText.map.loadingState}
                />
              )}
            </div>
          )}
          {isQuizComplete && (
            <ResultSummary
              points={game.points}
              correctAnswers={game.correctAnswers}
              totalQuestions={game.questions.length}
              maxPointsPerQuestion={isCountryGuess ? pointsPerCountryHit : maxPointsPerQuestion}
              questionResults={game.questionResults}
              onReplay={newGame}
              content={isCountryGuess ? COUNTRY_GUESS_SUMMARY_CONTENT : RESULT_SUMMARY_CONTENT}
              stat={
                isCountryGuess
                  ? { label: gameText.countryGuess.timeLabel, value: formatTime(game.elapsedMs) }
                  : undefined
              }
            />
          )}
        </Overlay>
      )}
      <GameplayInstructions
        isOpen={gameState === 'ready' && isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        backLabel={gameText.instructions.backLabel}
        eyebrow={gameText.instructions.eyebrow}
        title={gameText.instructions.title}
        description={gameText.instructions.description}
        steps={[...gameText.instructions.steps]}
      />
      {notices.length > 0 && (
        <div className={styles.notices}>
          {notices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </div>
      )}
      {gameState === 'ready' && !isHelpOpen && (
        <FloatingPanel position="top-left" priority="high" className={styles.readyControls}>
          <GameButton
            type="help"
            label={gameText.instructions.eyebrow}
            hover
            onClick={() => setIsHelpOpen(true)}
          />
          <AccountControls user={auth.user} onLogin={() => setIsAuthOpen(true)} onLogout={auth.logout} />
        </FloatingPanel>
      )}
      {gameState === 'started' && (
        <FloatingPanel position="top-left" priority="high" className={styles.gameControls}>
          <span className={styles.activeMode}>{game.activeMode?.name}</span>
          {isCountryGuess && (
            <span className={styles.stopwatch} role="timer" aria-label={gameText.countryGuess.timeLabel}>
              {formatTime(game.elapsedMs)}
            </span>
          )}
          <GameButton type="pause" label={gameText.controls.pause} hover onClick={() => void pause()} />
          <GameButton type="stop" label={gameText.controls.stop} hover onClick={stop} />
        </FloatingPanel>
      )}
      {game.activeMode && (
        <>
          {!isQuizComplete && (
            <PlayerScore
              name={currentPlayer}
              points={game.points}
              pointsLabel={isCountryGuess ? gameText.countryGuess.hitsLabel : gameText.playerPointsLabel}
            />
          )}
          {isAnswerSubmitted && !isCountryGuess && (
            <PointsAward points={game.questionResults[game.questionIndex].pointsEarned} />
          )}
          {isCountryGuessRunning && currentQuestion && (
            <FloatingPanel position="left-center" mobilePosition="bottom-center">
              <CountryGuessPanel
                key={currentQuestion.id}
                prompt={currentQuestion.prompt}
                questionLabel={gameText.countryGuess.label(game.questionIndex + 1, game.questions.length)}
                inputLabel={gameText.countryGuess.inputLabel}
                placeholder={gameText.countryGuess.placeholder}
                skipLabel={gameText.countryGuess.skipLabel}
                wrongAnswer={game.selectedAnswer}
                wrongAnswerMessage={gameText.countryGuess.wrongAnswer}
                previousResult={
                  lastResult && {
                    isCorrect: lastResult.isCorrect,
                    message: lastResult.isCorrect
                      ? gameText.countryGuess.previousCorrect(String(lastResult.correctAnswer))
                      : gameText.countryGuess.previousSkipped(String(lastResult.correctAnswer)),
                  }
                }
                onSubmit={(answer) => void answerCountryGuess(answer)}
                onSkip={() => void answerCountryGuess()}
              />
            </FloatingPanel>
          )}
          {gameState === 'started' && historyQuestion && (
            <FloatingPanel position="left-center" mobilePosition="bottom-center">
              <HistoryQuestionPanel
                key={historyQuestion.id}
                question={historyQuestion}
                questionLabel={gameText.question.label(game.questionIndex + 1, game.questions.length)}
                selectedLocation={game.selectedAnswer}
                selectedOptionIds={game.selectedHistoryOptions}
                result={game.historyFeedback}
                feedback={feedback}
                submitting={isHistorySubmitting}
                onToggle={(optionId) => {
                  if (!checkingAnswer.current && !isAnswerSubmitted) {
                    dispatch({ type: 'toggleHistoryOption', optionId });
                  }
                }}
                onSubmit={() => void submitHistoryAnswer()}
                onNext={nextQuestion}
              />
            </FloatingPanel>
          )}
          {gameState === 'started' && !isCountryGuess && !isHistory && (
            <FloatingPanel position="left-center" mobilePosition="bottom-center">
              <QuestionPanel
                question={currentQuestion}
                selectedAnswer={game.selectedAnswer ?? undefined}
                onSubmit={submitAnswer}
                feedback={feedback}
                onNext={nextQuestion}
                questionLabel={gameText.question.label(game.questionIndex + 1, game.questions.length)}
              />
            </FloatingPanel>
          )}
        </>
      )}
      {(!game.activeMode || (isQuizComplete && !isCountryGuess && !isHistory)) && (
        <Leaderboards
          entries={leaderboards}
          currentPlayerName={currentPlayer}
          content={LEADERBOARD_CONTENT}
          tabs={LEADERBOARD_TABS}
          activeTabId={String(leaderboardModeId)}
          onTabChange={selectLeaderboardMode}
          isLoading={isLoadingLeaderboards}
          loadingLabel={<AppLoadingSpinner label={gameText.leaderboard.loadingState} />}
        />
      )}
      <CardsModal
        isOpen={isModalOpen}
        backButton={
          gameState === 'selecting'
            ? {
                onClick: back,
                label: gameText.controls.back,
              }
            : undefined
        }
        eyebrow={isPaused ? gameText.controls.pausedEyebrow : gameText.controls.readyEyebrow}
        title={isPaused ? gameText.controls.pausedTitle : isChoosingHistoryEra ? gameText.history.eraTitle : gameText.controls.chooseModeTitle}
        description={isPaused ? gameText.controls.pausedDescription : isChoosingHistoryEra ? gameText.history.eraDescription : gameText.controls.chooseModeDescription}
        footer={
          game.activeMode && (
            <div className={styles.pauseActions}>
              <GameButton type="resume" label={gameText.controls.resume} onClick={() => void resume()} />
              <GameButton type="new-game" label={gameText.controls.newGame} onClick={newGame} />
            </div>
          )
        }
      >
        {!game.activeMode && isChoosingHistoryEra && (
          HISTORY_ERAS.map((era) => (
            <Card key={era} onClick={() => void selectMode(HISTORY_MODE, era)}>
              <span className={styles.cardTitle}>{gameText.history.eras[era]}</span>
              <span className={styles.cardAction}>
                {game.loadingModeId === HISTORY_MODE.id ? gameText.modes.loadingAction : gameText.modes.startAction}
              </span>
            </Card>
          ))
        )}
        {!game.activeMode && !isChoosingHistoryEra &&
          GAME_MODES.map((mode) => (
            <Card key={mode.name} onClick={() => void selectMode(mode)}>
              <span className={styles.cardIcon}>{mode.icon}</span>
              <span className={styles.cardTitle}>{mode.name}</span>
              <span className={styles.cardDescription}>{mode.description}</span>
              <span className={styles.cardAction}>
                {game.loadingModeId === mode.id ? gameText.modes.loadingAction : gameText.modes.startAction}
                {game.loadingModeId !== mode.id && <span> {gameText.modes.actionArrow}</span>}
              </span>
            </Card>
          ))}
      </CardsModal>
      {isAuthOpen && (
        <AuthDialog onClose={() => setIsAuthOpen(false)} onLogin={auth.login} onRegister={auth.register} />
      )}
      <footer className={styles.projectFooter}>
        <strong>{gameText.footer.name}</strong>
        <span>{gameText.footer.description}</span>
      </footer>
    </main>
  );
}

export default Game;
