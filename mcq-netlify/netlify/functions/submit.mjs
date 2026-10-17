import { pool } from "../lib/db.mjs";

const feedback = (percent) =>
  percent >= 90 ? "Excellent!"
  : percent >= 70 ? "Very good."
  : percent >= 50 ? "Good start; practise the topics you missed."
  : "Review the worked solutions and try again.";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  let input = {};
  try { input = await req.json(); } catch { /* empty body */ }

  const name = String(input.name ?? "").trim().slice(0, 100) || "Anonymous";
  const answers = input.answers && typeof input.answers === "object" ? input.answers : {};

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, topic, question_text, option_a, option_b, option_c, option_d,
              correct_option, explanation
       FROM questions ORDER BY sort_order, id`
    );

    let score = 0;
    const results = rows.map((r) => {
      const options = { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d };
      const picked = answers[r.id];
      const selected = ["A", "B", "C", "D"].includes(picked) ? picked : null;
      const isCorrect = selected === r.correct_option;
      if (isCorrect) score++;

      return {
        id: r.id,
        topic: r.topic,
        question: r.question_text,
        selected,
        selected_text: selected ? options[selected] : null,
        correct: r.correct_option,
        correct_text: options[r.correct_option],
        is_correct: isCorrect,
        explanation: r.explanation,
      };
    });

    const total = rows.length;
    const percent = total ? (score / total) * 100 : 0;

    await client.query("BEGIN");
    const { rows: [attempt] } = await client.query(
      "INSERT INTO attempts (player_name, score, total) VALUES ($1, $2, $3) RETURNING id",
      [name, score, total]
    );
    for (const r of results) {
      await client.query(
        `INSERT INTO attempt_answers (attempt_id, question_id, selected_option, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attempt.id, r.id, r.selected, r.is_correct]
      );
    }
    await client.query("COMMIT");

    return Response.json({
      score,
      total,
      percent: Math.round(percent),
      feedback: feedback(percent),
      results,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    console.error(err);
    return Response.json({ error: "Could not submit your answers." }, { status: 500 });
  } finally {
    client.release();
  }
};

export const config = { path: "/api/submit" };