import { query } from './_db.js';

export default async function handler(req, res) {
  // Accept both GET and POST for easy browser access
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create tables with enhanced schema
    await query(`
      CREATE TABLE IF NOT EXISTS exercises (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          muscle_group VARCHAR(50) NOT NULL,
          equipment_type VARCHAR(50) NOT NULL,
          tracking_type VARCHAR(20) NOT NULL DEFAULT 'weight_reps',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL DEFAULT CURRENT_DATE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS session_sets (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
          exercise_id INTEGER REFERENCES exercises(id),
          set_number INTEGER NOT NULL CHECK (set_number >= 1 AND set_number <= 6),
          reps INTEGER,
          weight_kg DECIMAL(6,2),
          duration_seconds INTEGER,
          distance_meters DECIMAL(8,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(50) UNIQUE NOT NULL,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_session_sets_exercise ON session_sets(exercise_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_exercises_tracking_type ON exercises(tracking_type)');

    // Check if exercises already exist
    const existingExercises = await query('SELECT COUNT(*) as count FROM exercises');
    
    if (existingExercises[0].count === 0) {
      // Insert enhanced exercise library with tracking types
      const exercises = [
        // CHEST - Weight + Reps
        ['Bench Press (Barbell)', 'Chest', 'Free Weight', 'weight_reps'],
        ['Incline Bench Press', 'Chest', 'Free Weight', 'weight_reps'],
        ['Chest Press Machine', 'Chest', 'Machine', 'weight_reps'],
        ['Cable Fly', 'Chest', 'Cable', 'weight_reps'],
        ['Dumbbell Fly', 'Chest', 'Free Weight', 'weight_reps'],
        ['Push-ups', 'Chest', 'Bodyweight', 'reps_only'],
        
        // BACK - Weight + Reps
        ['Lat Pulldown', 'Back', 'Machine', 'weight_reps'],
        ['Seated Cable Row', 'Back', 'Cable', 'weight_reps'],
        ['Barbell Row', 'Back', 'Free Weight', 'weight_reps'],
        ['Deadlift', 'Back', 'Free Weight', 'weight_reps'],
        ['Pull-ups', 'Back', 'Bodyweight', 'reps_only'],
        ['T-Bar Row', 'Back', 'Machine', 'weight_reps'],
        
        // LEGS - Weight + Reps
        ['Leg Press', 'Legs', 'Machine', 'weight_reps'],
        ['Squat (Barbell)', 'Legs', 'Free Weight', 'weight_reps'],
        ['Leg Extension', 'Legs', 'Machine', 'weight_reps'],
        ['Leg Curl', 'Legs', 'Machine', 'weight_reps'],
        ['Calf Raise', 'Legs', 'Machine', 'weight_reps'],
        ['Romanian Deadlift', 'Legs', 'Free Weight', 'weight_reps'],
        ['Hack Squat', 'Legs', 'Machine', 'weight_reps'],
        ['Bodyweight Squats', 'Legs', 'Bodyweight', 'reps_only'],
        
        // SHOULDERS - Weight + Reps
        ['Shoulder Press (Dumbbell)', 'Shoulders', 'Free Weight', 'weight_reps'],
        ['Shoulder Press Machine', 'Shoulders', 'Machine', 'weight_reps'],
        ['Lateral Raise', 'Shoulders', 'Free Weight', 'weight_reps'],
        ['Face Pull', 'Shoulders', 'Cable', 'weight_reps'],
        ['Front Raise', 'Shoulders', 'Free Weight', 'weight_reps'],
        
        // ARMS - Weight + Reps
        ['Bicep Curl (Barbell)', 'Arms', 'Free Weight', 'weight_reps'],
        ['Bicep Curl (Dumbbell)', 'Arms', 'Free Weight', 'weight_reps'],
        ['Preacher Curl', 'Arms', 'Machine', 'weight_reps'],
        ['Tricep Pushdown', 'Arms', 'Cable', 'weight_reps'],
        ['Tricep Dips', 'Arms', 'Bodyweight', 'reps_only'],
        ['Overhead Tricep Extension', 'Arms', 'Free Weight', 'weight_reps'],
        ['Hammer Curl', 'Arms', 'Free Weight', 'weight_reps'],
        
        // CORE/ABS - Reps Only
        ['Abdominal Crunches', 'Core', 'Bodyweight', 'reps_only'],
        ['Decline Bench Crunches', 'Core', 'Bodyweight', 'reps_only'],
        ['Plank', 'Core', 'Bodyweight', 'duration'],
        ['Side Plank', 'Core', 'Bodyweight', 'duration'],
        ['Hyperextension Side Bends', 'Core', 'Bodyweight', 'reps_only'],
        ['Oblique Barbell Twist', 'Core', 'Free Weight', 'reps_only'],
        ['Russian Twists', 'Core', 'Bodyweight', 'reps_only'],
        ['Leg Raises', 'Core', 'Bodyweight', 'reps_only'],
        ['Mountain Climbers', 'Core', 'Bodyweight', 'reps_only'],
        
        // CARDIO - Duration
        ['Treadmill Run', 'Cardio', 'Machine', 'duration'],
        ['Treadmill Walk', 'Cardio', 'Machine', 'duration'],
        ['Stationary Bike', 'Cardio', 'Machine', 'duration'],
        ['Elliptical', 'Cardio', 'Machine', 'duration'],
        ['Rowing Machine', 'Cardio', 'Machine', 'duration'],
        ['Air Rower', 'Cardio', 'Machine', 'duration'],
        ['Cross Trainer', 'Cardio', 'Machine', 'duration'],
        ['Stair Climber', 'Cardio', 'Machine', 'duration'],
        ['Jogging', 'Cardio', 'Bodyweight', 'duration'],
        ['Running', 'Cardio', 'Bodyweight', 'duration'],
        ['Jump Rope', 'Cardio', 'Equipment', 'duration'],
        
        // MOBILITY & FUNCTIONAL - Duration or Reps
        ['Full Body Stretching', 'Mobility', 'Bodyweight', 'duration'],
        ['Dynamic Warmup', 'Mobility', 'Bodyweight', 'duration'],
        ['Foam Rolling', 'Mobility', 'Equipment', 'duration'],
        ['Yoga Flow', 'Mobility', 'Bodyweight', 'duration'],
        
        // FUNCTIONAL/WHOLE BODY - Distance or Reps
        ['Sprint', 'Whole Body', 'Bodyweight', 'reps_only'],
        ['Burpees', 'Whole Body', 'Bodyweight', 'reps_only'],
        ['Wrestling Push-ups', 'Whole Body', 'Bodyweight', 'reps_only'],
        ['ABC Exercise', 'Whole Body', 'Bodyweight', 'reps_only'],
        ['Monkey Walk', 'Whole Body', 'Bodyweight', 'distance'],
        ['Bear Crawl', 'Whole Body', 'Bodyweight', 'distance'],
        ['Crab Walk', 'Whole Body', 'Bodyweight', 'distance'],
        ['Duck Walk', 'Whole Body', 'Bodyweight', 'distance'],
        ['Backward Walk', 'Whole Body', 'Bodyweight', 'distance'],
        ['Farmer Walk', 'Whole Body', 'Free Weight', 'distance'],
        
        // COMPOUND MOVEMENTS
        ['Clean and Press', 'Compound', 'Free Weight', 'weight_reps'],
        ['Thrusters', 'Compound', 'Free Weight', 'weight_reps'],
        ['Turkish Get-Up', 'Compound', 'Free Weight', 'reps_only'],
        ['Kettlebell Swings', 'Compound', 'Free Weight', 'reps_only'],
        ['Box Jumps', 'Compound', 'Equipment', 'reps_only']
      ];

      for (const [name, muscleGroup, equipmentType, trackingType] of exercises) {
        await query(
          'INSERT INTO exercises (name, muscle_group, equipment_type, tracking_type) VALUES ($1, $2, $3, $4)',
          [name, muscleGroup, equipmentType, trackingType]
        );
      }
    }

    return res.status(200).json({ 
      message: 'Database initialized successfully',
      exercisesCount: existingExercises[0].count === 0 ? 70 : existingExercises[0].count
    });

  } catch (error) {
    console.error('Init Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
