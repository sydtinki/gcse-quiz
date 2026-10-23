import { pool } from "../lib/db.mjs";
import { json, requireUser } from "../lib/auth.mjs";
import { QUIZZES } from "../lib/quizzes-data.mjs";

function feedback(quiz, score, total) {
  if (quiz.main) {
    if (score >= 130) return "Strong practice performance. Review mistakes and practise timed past papers.";
    if (score >= 110) return "Good progress. Focus on the topics where you lost marks.";
    if (score >= 85) return "Build consistency by revising methods and repeating topic-based questions.";
    return "Revise core skills topic by topic, then attempt the paper again.";
  }
  const pct = total ? (score / total) * 100 : 0;
  if (pct >= 90) return "Excellent!";
  if (pct >= 70) return "Very good.";
  if (pct >= 50) return "Good start; practise the topics you missed.";
  return "Review the worked solutions and try again.";
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const { user, response } = await requireUser(req);
    if (response) return response;

    let input = {};
    try { input = await req.json(); } catch { /* empty body */ }

    const quiz = QUIZZES.find((q) => q.id === Number(input.quizId));
    if (!quiz) return json({ error: "Quiz not found." }, 404);
    const answers = input.answers && typeof input.answers === "object" ? input.answers : {};

    let score = 0;
    const saved = {};
    const results = quiz.questions.map((q) => {
      const picked = answers[q.id];
      const selected = ["A", "B", "C", "D"].includes(picked) ? picked : null;
      const isCorrect = selected === q.answer;
      if (isCorrect) score++;
      saved[q.id] = selected;
      return {
        id: q.id,
        topic: q.topic,
        question: q.question,
        selected,
        selected_text: selected ? q.options[selected] : null,
        correct: q.answer,
        correct_text: q.options[q.answer],
        is_correct: isCorrect,
        explanation: q.explanation,
      };
    });

    const total = quiz.questions.length;
    await pool.query(
      "INSERT INTO quiz_attempts (user_id, quiz_id, score, total, answers) VALUES ($1, $2, $3, $4, $5)",
      [user.id, quiz.id, score, total, JSON.stringify(saved)]
    );

    return json({
      quizId: quiz.id,
      quizName: quiz.name,
      main: quiz.main,
      score,
      total,
      percent: Math.round((score / total) * 100),
      feedback: feedback(quiz, score, total),
      results,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Could not submit your answers." }, 500);
  }
};

export const config = { path: "/api/submit" };
