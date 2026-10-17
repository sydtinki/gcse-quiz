CREATE TABLE questions (
  id             SERIAL PRIMARY KEY,
  sort_order     INT NOT NULL DEFAULT 0,
  topic          VARCHAR(100) NOT NULL,
  question_text  TEXT NOT NULL,
  option_a       VARCHAR(255) NOT NULL,
  option_b       VARCHAR(255) NOT NULL,
  option_c       VARCHAR(255) NOT NULL,
  option_d       VARCHAR(255) NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation    TEXT NOT NULL
);

CREATE TABLE attempts (
  id          SERIAL PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  score       SMALLINT NOT NULL,
  total       SMALLINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attempt_answers (
  id              SERIAL PRIMARY KEY,
  attempt_id      INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id     INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
  is_correct      BOOLEAN NOT NULL
);

INSERT INTO questions
(sort_order, topic, question_text, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES
(1, 'Algebra', 'Solve for x: 3x + 7 = 22',
 'x = 3', 'x = 5', 'x = 7', 'x = 9', 'B',
 'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.'),

(2, 'Percentages', U&'A jacket costs \00A380. Its price is reduced by 25%. What is the sale price?',
 U&'\00A320', U&'\00A355', U&'\00A360', U&'\00A365', 'C',
 U&'25% of \00A380 is \00A320. Sale price = \00A380 \2212 \00A320 = \00A360.'),

(3, 'Fractions', 'Calculate: 2/3 + 1/6',
 '3/9', '1/2', '5/6', '3/6', 'C',
 'Convert 2/3 to 4/6. Then 4/6 + 1/6 = 5/6.'),

(4, 'Geometry', U&'A triangle has angles of 45\00B0 and 65\00B0. Find the third angle.',
 U&'60\00B0', U&'70\00B0', U&'80\00B0', U&'90\00B0', 'B',
 U&'Angles in a triangle add up to 180\00B0. So 180\00B0 \2212 45\00B0 \2212 65\00B0 = 70\00B0.'),

(5, 'Ratio', U&'Divide \00A360 in the ratio 2:3. What is the larger share?',
 U&'\00A320', U&'\00A324', U&'\00A330', U&'\00A336', 'D',
 U&'There are 5 parts altogether. \00A360 \00F7 5 = \00A312 per part. The larger share is 3 \00D7 \00A312 = \00A336.'),

(6, 'Probability', 'A fair six-sided die is rolled once. What is the probability of getting an even number?',
 '1/6', '1/3', '1/2', '2/3', 'C',
 'The even outcomes are 2, 4 and 6. Probability = 3/6 = 1/2.'),

(7, 'Area', 'A rectangle has a length of 12 cm and a width of 5 cm. Calculate its area.',
 U&'17 cm\00B2', U&'34 cm\00B2', U&'60 cm\00B2', U&'120 cm\00B2', 'C',
 U&'Area = length \00D7 width = 12 \00D7 5 = 60 cm\00B2.'),

(8, 'Sequences', 'Find the next number: 4, 7, 10, 13, ___',
 '15', '16', '17', '18', 'B',
 'The sequence increases by 3 each time. The next number is 13 + 3 = 16.'),

(9, 'Mean (Average)', 'Find the mean of 6, 8, 10, 12 and 14.',
 '8', '9', '10', '12', 'C',
 U&'Mean = (6 + 8 + 10 + 12 + 14) \00F7 5 = 50 \00F7 5 = 10.'),

(10, 'Pythagoras'' Theorem', 'A right-angled triangle has shorter sides of 6 cm and 8 cm. Find the hypotenuse.',
 '9 cm', '10 cm', '12 cm', '14 cm', 'B',
 U&'c\00B2 = 6\00B2 + 8\00B2 = 36 + 64 = 100, so c = \221A100 = 10 cm.');
