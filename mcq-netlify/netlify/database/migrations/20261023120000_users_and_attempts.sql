-- Questions now live in netlify/lib/quizzes-data.mjs, so the old demo tables are removed.
DROP TABLE IF EXISTS attempt_answers;
DROP TABLE IF EXISTS attempts;
DROP TABLE IF EXISTS questions;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_year  SMALLINT NOT NULL,
  device_id     VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_attempts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id    SMALLINT NOT NULL,
  score      SMALLINT NOT NULL,
  total      SMALLINT NOT NULL,
  answers    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quiz_attempts_user_quiz_idx ON quiz_attempts (user_id, quiz_id);