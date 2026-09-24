import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const learningEvents = sqliteTable('learning_events', {
  learnerId: text('learner_id').notNull(),
  id: text('id').notNull(),
  lessonId: text('lesson_id').notNull(),
  kind: text('kind').notNull(),
  surface: text('surface'),
  choice: integer('choice'),
  at: integer('at').notNull(),
}, t => [primaryKey({columns:[t.learnerId,t.id]}),index('events_learner_time').on(t.learnerId,t.at)]);
