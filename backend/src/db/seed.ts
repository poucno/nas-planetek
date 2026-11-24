import { notInArray, sql } from "drizzle-orm";
import { db, pool } from "./index.js";
import { guessCountries, historyQuestions, questions } from "./schema.js";
import { seedGuessCountries } from "./seedGuessCountries.js";
import { seedQuestions } from "./seedQuestions.js";
import { seedHistoryQuestions } from "./seedHistoryQuestions.js";

// Ob ponovnem zagonu obstoječa vprašanja posodobi in odstrani tista, ki jih ni več v seznamu
try {
  await db.transaction(async (tx) => {
    await tx.delete(questions).where(
      notInArray(
        questions.id,
        seedQuestions.map(({ id }) => id),
      ),
    );
    await tx
      .insert(questions)
      .values(seedQuestions)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          category: sql`excluded.category`,
          prompt: sql`excluded.prompt`,
          hint: sql`excluded.hint`,
          fact: sql`excluded.fact`,
          answer: sql`excluded.answer`,
          lng: sql`excluded.lng`,
          lat: sql`excluded.lat`,
          country: sql`excluded.country`,
        },
      });

    await tx.delete(guessCountries).where(
      notInArray(
        guessCountries.id,
        seedGuessCountries.map(({ id }) => id),
      ),
    );
    await tx
      .insert(guessCountries)
      .values(seedGuessCountries)
      .onConflictDoUpdate({
        target: guessCountries.id,
        set: {
          name: sql`excluded.name`,
          mapCountries: sql`excluded.map_countries`,
          aliases: sql`excluded.aliases`,
        },
      });

    await tx.delete(historyQuestions).where(
      notInArray(historyQuestions.id, seedHistoryQuestions.map(({ id }) => id)),
    );
    await tx.insert(historyQuestions).values(seedHistoryQuestions).onConflictDoUpdate({
      target: historyQuestions.id,
      set: {
        era: sql`excluded.era`,
        period: sql`excluded.period`,
        prompt: sql`excluded.prompt`,
        hint: sql`excluded.hint`,
        answerLabel: sql`excluded.answer_label`,
        explanation: sql`excluded.explanation`,
        sources: sql`excluded.sources`,
        data: sql`excluded.data`,
      },
    });
  });

  const count = await db.$count(questions);
  const countryCount = await db.$count(guessCountries);
  const historyCount = await db.$count(historyQuestions);
  console.log(`Seed uspešen, vprašanj v bazi: ${count}, držav za ugibanje: ${countryCount}, zgodovinskih vprašanj: ${historyCount}`);
} catch (error) {
  console.error("Seed ni uspel:", error instanceof Error ? error.message : error);
  console.error("Ali baza teče (docker compose up -d db) in ali so migracije izvedene (npm run db:migrate)?");
  process.exitCode = 1;
} finally {
  await pool.end();
}
