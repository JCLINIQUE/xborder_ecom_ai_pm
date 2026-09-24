CREATE TABLE `learning_events` (
	`learner_id` text NOT NULL,
	`id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`kind` text NOT NULL,
	`surface` text,
	`choice` integer,
	`at` integer NOT NULL,
	PRIMARY KEY(`learner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `events_learner_time` ON `learning_events` (`learner_id`,`at`);