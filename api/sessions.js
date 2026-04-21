import { query } from './_db.js';

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
      const sessions = await query(`
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
      `);

      return res.status(200).json(sessions);
    }

    // POST - Create new session with enhanced tracking
    if (req.method === 'POST') {
      const { date, exercises, notes } = req.body;

      // Create session
      const sessionResult = await query(
        'INSERT INTO sessions (date, notes) VALUES ($1, $2) RETURNING id',
        [date, notes || null]
      );
      
      const sessionId = sessionResult[0].id;

      // Insert sets for each exercise with appropriate fields
      for (const exercise of exercises) {
        for (let i = 0; i < exercise.sets.length; i++) {
          const set = exercise.sets[i];
          
          // Check if set has any data based on tracking type
          const hasData = 
            (exercise.trackingType === 'weight_reps' && set.reps && set.weight) ||
            (exercise.trackingType === 'reps_only' && set.reps) ||
            (exercise.trackingType === 'duration' && set.duration) ||
            (exercise.trackingType === 'distance' && set.distance);
          
          if (hasData) {
            await query(
              'INSERT INTO session_sets (session_id, exercise_id, set_number, reps, weight_kg, duration_seconds, distance_meters) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                sessionId, 
                exercise.exerciseId, 
                i + 1, 
                set.reps ? parseInt(set.reps) : null,
                set.weight ? parseFloat(set.weight) : null,
                set.duration ? parseInt(set.duration) : null,
                set.distance ? parseFloat(set.distance) : null
              ]
            );
          }
        }
      }

      return res.status(201).json({ id: sessionId, message: 'Session created' });
    }

    // PUT - Update session
    if (req.method === 'PUT') {
      const { id, date, exercises, notes } = req.body;

      // Update session
      await query(
        'UPDATE sessions SET date = $1, notes = $2 WHERE id = $3',
        [date, notes || null, id]
      );

      // Delete existing sets
      await query('DELETE FROM session_sets WHERE session_id = $1', [id]);

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
            await query(
              'INSERT INTO session_sets (session_id, exercise_id, set_number, reps, weight_kg, duration_seconds, distance_meters) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                id, 
                exercise.exerciseId, 
                i + 1, 
                set.reps ? parseInt(set.reps) : null,
                set.weight ? parseFloat(set.weight) : null,
                set.duration ? parseInt(set.duration) : null,
                set.distance ? parseFloat(set.distance) : null
              ]
            );
          }
        }
      }

      return res.status(200).json({ message: 'Session updated' });
    }

    // DELETE - Delete session
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await query('DELETE FROM sessions WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Session deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
