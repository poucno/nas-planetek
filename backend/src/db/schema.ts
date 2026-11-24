import { sql } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { HistoryQuestionData, HistorySource } from "../history.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 50 }).notNull(),
    // Nikoli gesla, samo hash (bcrypt ali argon2), ki ga naredi API ob registraciji
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // Unikatnost ne loči velikih in malih črk, da Luka@... in luka@... nista dva računa
  (t) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`),
    uniqueIndex("users_username_lower_idx").on(sql`lower(${t.username})`),
  ],
);

export const questionCategory = pgEnum("question_category", [
  "capitals",
  "countries",
  "cities",
  "landforms",
  "seas",
  "islands",
  "lakes",
  "rivers",
  "basins",
  "guess_country",
]);

export const questions = pgTable("questions", {
  // Brez samodejnega štetja, ker seed določi stalne številke vprašanj
  id: integer("id").primaryKey(),
  category: questionCategory("category").notNull(),
  prompt: text("prompt").notNull(),
  hint: text("hint").notNull(),
  fact: text("fact").notNull(),
  // Besedilni odgovor, samo pri vprašanjih iz kategorije guess_country
  answer: text("answer"),
  // Pravilni odgovor, ki ga API razkrije šele po oddanem odgovoru
  lng: doublePrecision("lng").notNull(),
  lat: doublePrecision("lat").notNull(),
  // Ime v europe.geo.json, nastavljeno samo, ko je odgovor država
  country: text("country"),
});

export const historyEra = pgEnum("history_era", ["ww1", "ww2"]);

export const historyQuestions = pgTable("history_questions", {
  id: integer("id").primaryKey(),
  era: historyEra("era").notNull(),
  period: text("period").notNull(),
  prompt: text("prompt").notNull(),
  hint: text("hint").notNull(),
  answerLabel: text("answer_label").notNull(),
  explanation: text("explanation").notNull(),
  sources: jsonb("sources").$type<HistorySource[]>().notNull(),
  data: jsonb("data").$type<HistoryQuestionData>().notNull(),
});

export type HistoryQuestion = typeof historyQuestions.$inferSelect;

export const guessCountries = pgTable("guess_countries", {
  // Brez samodejnega štetja, ker seed določi stalne številke držav
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  // Imena v europe.geo.json, nekatere države so tam razdeljene na več delov
  mapCountries: text("map_countries").array().notNull(),
  // Druga sprejeta imena poleg name
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
});

export const countryGuessGames = pgTable("country_guess_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  // Nastavljen, dokler je igra začasno ustavljena
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  // Skupen čas prejšnjih pavz, ki se ne šteje v čas igre
  pausedMs: integer("paused_ms").notNull().default(0),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const countryGuessRoundStatus = pgEnum("country_guess_round_status", ["pending", "correct", "skipped"]);

export const countryGuessRounds = pgTable(
  "country_guess_rounds",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => countryGuessGames.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    countryId: integer("country_id")
      .notNull()
      .references(() => guessCountries.id, { onDelete: "cascade" }),
    status: countryGuessRoundStatus("status").notNull().default("pending"),
    // Pravilen ali zadnji napačen odgovor igralca
    lastAnswer: text("last_answer"),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.position] })],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type NewGuessCountry = typeof guessCountries.$inferInsert;
