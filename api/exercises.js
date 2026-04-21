import { query } from './_db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Get all exercises
    if (req.method === 'GET') {
      const exercises = await query(`
        SELECT id, name, muscle_group as "muscleGroup", equipment_type as "equipmentType", tracking_type as "trackingType"
        FROM exercises
        ORDER BY muscle_group, name
      `);

      return res.status(200).json(exercises);
    }

    // POST - Create new exercise
    if (req.method === 'POST') {
      const { name, muscleGroup, equipmentType, trackingType } = req.body;

      const result = await query(
        'INSERT INTO exercises (name, muscle_group, equipment_type, tracking_type) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, muscleGroup, equipmentType, trackingType || 'weight_reps']
      );

      return res.status(201).json({ 
        id: result[0].id, 
        name, 
        muscleGroup, 
        equipmentType,
        trackingType: trackingType || 'weight_reps',
        message: 'Exercise created' 
      });
    }

    // DELETE - Delete exercise
    if (req.method === 'DELETE') {
      const { id } = req.query;
      await query('DELETE FROM exercises WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Exercise deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
