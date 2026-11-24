import { QuestionPanel, type QuestionFeedback } from '@meridiani/components';
import type { HistoryFeedback, HistoryQuestion } from '@/api/types';
import { gameText } from './gameText';
import styles from './HistoryQuestionPanel.module.css';

const { history, question: questionText } = gameText;
const distanceFormat = new Intl.NumberFormat('sl-SI', { maximumFractionDigits: 1 });

type Props = {
  question: HistoryQuestion;
  questionLabel: string;
  selectedLocation: string | null;
  selectedOptionIds: string[];
  result: HistoryFeedback | null;
  feedback?: QuestionFeedback;
  submitting: boolean;
  onToggle: (optionId: string) => void;
  onSubmit: () => void;
  onNext: () => void;
};

export default function HistoryQuestionPanel({
  question, questionLabel, selectedLocation, selectedOptionIds, result, feedback, submitting,
  onToggle, onSubmit, onNext,
}: Props) {
  const hasChoices = question.kind === 'participants';
  const selection = hasChoices ? selectedOptionIds.join(',') : selectedLocation;
  const correctIds = result?.kind === 'participants' ? result.correctAnswer : [];

  return (
    <QuestionPanel
      question={question}
      questionLabel={`${questionLabel} · ${question.period}`}
      selectedAnswer={selection ?? undefined}
      onSubmit={onSubmit}
      onNext={onNext}
      feedback={feedback}
      submitting={submitting}
      submitLabel={submitting ? questionText.checkingAnswerLabel : questionText.submitLabel}
      nextLabel={questionText.nextLabel}
    >
      {question.kind === 'participants' ? (
        <fieldset className={styles.options} disabled={submitting || !!result}>
          <legend>{history.selectParticipants}</legend>
          {question.options.map(({ id, label }) => {
            const selected = selectedOptionIds.includes(id);
            const correct = correctIds.includes(id);
            const status = result && (correct
              ? (selected ? history.correctChoice : history.missedChoice)
              : (selected ? history.wrongChoice : null));

            return (
              <label key={id} className={styles.option}>
                <input type="checkbox" checked={selected} onChange={() => onToggle(id)} />
                <span>{label}{status && <small>{status}</small>}</span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p className={styles.instruction}>
          {selectedLocation ? `${questionText.selectedAnswerLabel} ${selectedLocation}` : history.selectLocation}
        </p>
      )}
      <div aria-live="polite">
        {result && (
          <div className={styles.result}>
            <p><strong>{history.answer} {result.answerLabel}</strong></p>
            <p>
              {result.kind === 'location' && history.distance(distanceFormat.format(result.distanceKm))}
              {result.kind === 'location' && ' · '}
              {history.points(result.points)}
            </p>
            <p>{result.explanation}</p>
            <ul>
              {result.sources.map(({ title, url }) => (
                <li key={url}><a href={url} target="_blank" rel="noreferrer">{title}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </QuestionPanel>
  );
}
