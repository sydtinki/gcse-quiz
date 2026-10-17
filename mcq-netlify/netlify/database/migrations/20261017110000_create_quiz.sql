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

(2, 'Percentages', 'A jacket costs £80. Its price is reduced by 25%. What is the sale price?',
 '£20', '£55', '£60', '£65', 'C',
 '25% of £80 is £20. Sale price = £80 - £20 = £60.'),

(3, 'Fractions', 'Calculate: 2/3 + 1/6',
 '3/9', '1/2', '5/6', '3/6', 'C',
 'Convert 2/3 to 4/6. Then 4/6 + 1/6 = 5/6.'),

(4, 'Geometry', 'A triangle has angles of 45° and 65°. Find the third angle.',
 '60°', '70°', '80°', '90°', 'B',
 'Angles in a triangle add up to 180°. So 180° - 45° - 65° = 70°.'),

(5, 'Ratio', 'Divide £60 in the ratio 2:3. What is the larger share?',
 '£20', '£24', '£30', '£36', 'D',
 'There are 5 parts altogether. £60 ÷ 5 = £12 per part. The larger share is 3 × £12 = £36.'),

(6, 'Probability', 'A fair six-sided die is rolled once. What is the probability of getting an even number?',
 '1/6', '1/3', '1/2', '2/3', 'C',
 'The even outcomes are 2, 4 and 6. Probability = 3/6 = 1/2.'),

(7, 'Area', 'A rectangle has a length of 12 cm and a width of 5 cm. Calculate its area.',
 '17 cm²', '34 cm²', '60 cm²', '120 cm²', 'C',
 'Area = length × width = 12 × 5 = 60 cm².'),

(8, 'Sequences', 'Find the next number: 4, 7, 10, 13, ___',
 '15', '16', '17', '18', 'B',
 'The sequence increases by 3 each time. The next number is 13 + 3 = 16.'),

(9, 'Mean (Average)', 'Find the mean of 6, 8, 10, 12 and 14.',
 '8', '9', '10', '12', 'C',
 'Mean = (6 + 8 + 10 + 12 + 14) ÷ 5 = 50 ÷ 5 = 10.'),

(10, 'Pythagoras'' Theorem', 'A right-angled triangle has shorter sides of 6 cm and 8 cm. Find the hypotenuse.',
 '9 cm', '10 cm', '12 cm', '14 cm', 'B',
 'c² = 6² + 8² = 36 + 64 = 100, so c = v100 = 10 cm.');