import { pool } from "../lib/db.mjs";

export default async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, topic, question_text, option_a, option_b, option_c, option_d
       FROM questions ORDER BY sort_order, id`
    );

    const questions = rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      question: r.question_text,
      options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
    }));

    return Response.json({ questions }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Could not load questions." }, { status: 500 });
  }
};

export const config = { path: "/api/questions" };