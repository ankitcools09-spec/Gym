import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get personal bests with date
      const personalBests = await sql`
        SELECT DISTINCT ON (ss.exercise_id)
          ss.exercise_id as "exerciseId",
          ss.reps,
          ss.weight_kg as weight,
          s.date
        FROM session_sets ss
        JOIN sessions s ON ss.session_id = s.id
        WHERE ss.reps IS NOT NULL AND ss.weight_kg IS NOT NULL
        ORDER BY ss.exercise_id, (ss.reps * ss.weight_kg) DESC
      `;

      // Convert to object format for frontend
      const pbsObject = {};
      personalBests.rows.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          reps: parseInt(pb.reps),
          weight: parseFloat(pb.weight),
          date: pb.date
        };
      });

      return res.status(200).json(pbsObject);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
