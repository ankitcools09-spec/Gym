import { query } from './_db.js';

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
      // Get personal bests (highest volume per exercise)
      const personalBests = await query(`
        SELECT 
          exercise_id as "exerciseId",
          MAX(reps * weight_kg) as volume,
          (SELECT reps FROM session_sets WHERE exercise_id = ss.exercise_id ORDER BY reps * weight_kg DESC LIMIT 1) as reps,
          (SELECT weight_kg FROM session_sets WHERE exercise_id = ss.exercise_id ORDER BY reps * weight_kg DESC LIMIT 1) as weight
        FROM session_sets ss
        GROUP BY exercise_id
      `);

      // Convert to object format for frontend
      const pbsObject = {};
      personalBests.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          volume: parseFloat(pb.volume),
          reps: parseInt(pb.reps),
          weight: parseFloat(pb.weight)
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
