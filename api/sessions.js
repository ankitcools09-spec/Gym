import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Get all sessions with enhanced data
    if (req.method === 'GET') {
      const result = await sql`
        SELECT 
          s.id,
          s.date,
          s.notes,
          s.created_at,
          json_agg(
            json_build_object(
              'exerciseId', ss.exercise_id,
              'exerciseName', e.name,
              'muscleGroup', e.muscle_group,
              'trackingType', e.tracking_type,
              'sets', (
                SELECT json_agg(
                  json_build_object(
                    'reps', ss2.reps,
                    'weight', ss2.weight_kg,
                    'duration', ss2.duration_seconds,
                    'distance', ss2.distance_meters
                  ) ORDER BY ss2.set_number
                )
                FROM session_sets ss2
                WHERE ss2.session_id = s.id AND ss2.exercise_id = ss.exercise_id
              )
            )
          ) as exercises
        FROM sessions s
        LEFT JOIN session_sets ss ON s.id = ss.session_id
        LEFT JOIN exercises e ON ss.exercise_id = e.id
        GROUP BY s.id, s.date, s.notes, s.created_at
        ORDER BY s.date DESC, s.created_at DESC
      `;

      return res.status(200).json(result.rows);
    }

    // POST - Create new session
    if (req.method === 'POST') {
      const { date, exercises, notes } = req.body;

      // Create session
      const sessionResult = await sql`
        INSERT INTO sessions (date, notes) 
        VALUES (${date}, ${notes || null}) 
        RETURNING id
      `;
      
      const sessionId = sessionResult.rows[0].id;

      // Insert sets for each exercise
      for (const exercise of exercises) {
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          
          // Check if set has data
          const hasData = 
            (exercise.trackingType === 'weight_reps' && set.reps && set.weight) ||
            (exercise.trackingType === 'reps_only' && set.reps) ||
            (exercise.trackingType === 'duration' && set.duration) ||
            (exercise.trackingType === 'distance' && set.distance);
          
          if (hasData) {
            const setNumber = i + 1;
            const reps = set.reps ? parseInt(set.reps) : null;
            const weight = set.weight ? parseFloat(set.weight) : null;
            const duration = set.duration ? parseInt(set.duration) : null;
            const distance = set.distance ? parseFloat(set.distance) : null;

            await sql`
              INSERT INTO session_sets 
              (session_id, exercise_id, set_number, reps, weight_kg, duration_seconds, distance_meters) 
              VALUES (${sessionId}, ${exercise.exerciseId}, ${setNumber}, ${reps}, ${weight}, ${duration}, ${distance})
            `;
          }
        }
      }

      return res.status(201).json({ id: sessionId, message: 'Session created' });
    }

    // PUT - Update session
    if (req.method === 'PUT') {
      const { id, date, exercises, notes } = req.body;

      // Update session
      await sql`
        UPDATE sessions 
        SET date = ${date}, notes = ${notes || null} 
        WHERE id = ${id}
      `;

      // Delete existing sets
      await sql`DELETE FROM session_sets WHERE session_id = ${id}`;

      // Insert updated sets
      for (const exercise of exercises) {
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          
          const hasData = 
            (exercise.trackingType === 'weight_reps' && set.reps && set.weight) ||
            (exercise.trackingType === 'reps_only' && set.reps) ||
            (exercise.trackingType === 'duration' && set.duration) ||
            (exercise.trackingType === 'distance' && set.distance);
          
          if (hasData) {
            const setNumber = i + 1;
            const reps = set.reps ? parseInt(set.reps) : null;
            const weight = set.weight ? parseFloat(set.weight) : null;
            const duration = set.duration ? parseInt(set.duration) : null;
            const distance = set.distance ? parseFloat(set.distance) : null;

            await sql`
              INSERT INTO session_sets 
              (session_id, exercise_id, set_number, reps, weight_kg, duration_seconds, distance_meters) 
              VALUES (${id}, ${exercise.exerciseId}, ${setNumber}, ${reps}, ${weight}, ${duration}, ${distance})
            `;
          }
        }
      }

      return res.status(200).json({ message: 'Session updated' });
    }

    // DELETE - Delete session
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await sql`DELETE FROM sessions WHERE id = ${id}`;
      return res.status(200).json({ message: 'Session deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
