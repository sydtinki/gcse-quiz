import { pool } from "../lib/db.mjs";
import { json, requireUser } from "../lib/auth.mjs";
import { QUIZZES } from "../lib/quizzes-data.mjs";

export default async (req) => {
  const url = new URL(req.url);
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    if (url.pathname === "/api/quizzes") {
      const { rows } = await pool.query(
        `SELECT quiz_id, MAX(score) AS best, MAX(total) AS total
         FROM quiz_attempts WHERE user_id = $1 GROUP BY quiz_id`,
        [user.id]
      );
      const bestByQuiz = new Map(rows.map((r) => [r.quiz_id, r]));
      const quizzes = QUIZZES.map((q) => {
        const b = bestByQuiz.get(q.id);
        return {
          id: q.id,
          name: q.name,
          main: q.main,
          count: q.questions.length,
          best: b ? Number(b.best) : null,
          total: b ? Number(b.total) : null,
        };
      });
      return json({ quizzes });
    }

    if (url.pathname === "/api/quiz") {
      const id = Number(url.searchParams.get("id"));
      const quiz = QUIZZES.find((q) => q.id === id);
      if (!quiz) return json({ error: "Quiz not found." }, 404);
      return json({
        id: quiz.id,
        name: quiz.name,
        main: quiz.main,
        // correct answers and explanations are NOT sent until the quiz is submitted
        questions: quiz.questions.map(({ id, topic, question, options }) => ({ id, topic, question, options })),
      });
    }

    return json({ error: "Not found." }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error. Please try again." }, 500);
  }
};

export const config = { path: ["/api/quizzes", "/api/quiz"] };