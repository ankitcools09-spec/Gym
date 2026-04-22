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
      // Get personal bests for ALL exercise types
      const pbsObject = {};
      
      // Weight + Reps PRs (highest volume)
      const weightRepsResult = await sql`
        SELECT DISTINCT ON (ss.exercise_id)
          ss.exercise_id as "exerciseId",
          ss.reps,
          ss.weight_kg as weight,
          s.date,
          e.tracking_type as "trackingType"
        FROM session_sets ss
        JOIN sessions s ON ss.session_id = s.id
        JOIN exercises e ON ss.exercise_id = e.id
        WHERE ss.reps IS NOT NULL 
          AND ss.weight_kg IS NOT NULL
          AND e.tracking_type = 'weight_reps'
        ORDER BY ss.exercise_id, (ss.reps * ss.weight_kg) DESC
      `;
      
      weightRepsResult.rows.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          reps: parseInt(pb.reps),
          weight: parseFloat(pb.weight),
          date: pb.date,
          trackingType: pb.trackingType
        };
      });
      
      // Reps Only PRs (highest reps)
      const repsOnlyResult = await sql`
        SELECT DISTINCT ON (ss.exercise_id)
          ss.exercise_id as "exerciseId",
          ss.reps,
          s.date,
          e.tracking_type as "trackingType"
        FROM session_sets ss
        JOIN sessions s ON ss.session_id = s.id
        JOIN exercises e ON ss.exercise_id = e.id
        WHERE ss.reps IS NOT NULL
          AND e.tracking_type = 'reps_only'
        ORDER BY ss.exercise_id, ss.reps DESC
      `;
      
      repsOnlyResult.rows.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          reps: parseInt(pb.reps),
          date: pb.date,
          trackingType: pb.trackingType
        };
      });
      
      // Duration PRs (longest duration)
      const durationResult = await sql`
        SELECT DISTINCT ON (ss.exercise_id)
          ss.exercise_id as "exerciseId",
          ss.duration_seconds as duration,
          s.date,
          e.tracking_type as "trackingType"
        FROM session_sets ss
        JOIN sessions s ON ss.session_id = s.id
        JOIN exercises e ON ss.exercise_id = e.id
        WHERE ss.duration_seconds IS NOT NULL
          AND e.tracking_type = 'duration'
        ORDER BY ss.exercise_id, ss.duration_seconds DESC
      `;
      
      durationResult.rows.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          duration: parseInt(pb.duration),
          date: pb.date,
          trackingType: pb.trackingType
        };
      });
      
      // Distance PRs (longest distance)
      const distanceResult = await sql`
        SELECT DISTINCT ON (ss.exercise_id)
          ss.exercise_id as "exerciseId",
          ss.distance_meters as distance,
          s.date,
          e.tracking_type as "trackingType"
        FROM session_sets ss
        JOIN sessions s ON ss.session_id = s.id
        JOIN exercises e ON ss.exercise_id = e.id
        WHERE ss.distance_meters IS NOT NULL
          AND e.tracking_type = 'distance'
        ORDER BY ss.exercise_id, ss.distance_meters DESC
      `;
      
      distanceResult.rows.forEach(pb => {
        pbsObject[pb.exerciseId] = {
          distance: parseFloat(pb.distance),
          date: pb.date,
          trackingType: pb.trackingType
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
