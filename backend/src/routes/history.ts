import { eq, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { historyQuestions } from "../db/schema.js";
import { gradeHistoryAnswer, isHistoryEra, makeHistoryRound, parseHistoryAnswer } from "../history.js";

export const historyRouter = Router();

historyRouter.get("/", async (req, res) => {
  const { era } = req.query;
  if (!isHistoryEra(era)) {
    res.status(400).json({ error: "Izberi prvo ali drugo svetovno vojno." });
    return;
  }

  const questions = await db.select().from(historyQuestions)
    .where(eq(historyQuestions.era, era))
    .orderBy(sql`random()`);
  res.json(makeHistoryRound(questions));
});

historyRouter.post("/check", async (req, res) => {
  const { questionId, answer } = (req.body ?? {}) as Record<string, unknown>;
  const parsed = parseHistoryAnswer(answer);
  if (typeof questionId !== "number" || !Number.isInteger(questionId) || questionId <= 0 || questionId > 2147483647 || !parsed) {
    res.status(400).json({ error: "Vprašanje ali odgovor ni veljaven." });
    return;
  }

  const [question] = await db.select().from(historyQuestions).where(eq(historyQuestions.id, questionId));
  if (!question) {
    res.status(404).json({ error: "Zgodovinsko vprašanje ne obstaja." });
    return;
  }

  const result = gradeHistoryAnswer(question, parsed);
  if (!result) {
    res.status(400).json({ error: "Odgovor ne ustreza vprašanju." });
    return;
  }

  res.json(result);
});
