import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Initial exercise library - will be merged with custom exercises
const DEFAULT_EXERCISES = [
  { id: 1, name: 'Bench Press (Barbell)', muscleGroup: 'Chest', equipmentType: 'Free Weight', isCustom: false },
  { id: 2, name: 'Incline Bench Press', muscleGroup: 'Chest', equipmentType: 'Free Weight', isCustom: false },
  { id: 3, name: 'Chest Press Machine', muscleGroup: 'Chest', equipmentType: 'Machine', isCustom: false },
  { id: 4, name: 'Cable Fly', muscleGroup: 'Chest', equipmentType: 'Cable', isCustom: false },
  { id: 5, name: 'Dumbbell Fly', muscleGroup: 'Chest', equipmentType: 'Free Weight', isCustom: false },
  { id: 6, name: 'Lat Pulldown', muscleGroup: 'Back', equipmentType: 'Machine', isCustom: false },
  { id: 7, name: 'Seated Cable Row', muscleGroup: 'Back', equipmentType: 'Cable', isCustom: false },
  { id: 8, name: 'Barbell Row', muscleGroup: 'Back', equipmentType: 'Free Weight', isCustom: false },
  { id: 9, name: 'Deadlift', muscleGroup: 'Back', equipmentType: 'Free Weight', isCustom: false },
  { id: 10, name: 'Pull-ups', muscleGroup: 'Back', equipmentType: 'Bodyweight', isCustom: false },
  { id: 11, name: 'T-Bar Row', muscleGroup: 'Back', equipmentType: 'Machine', isCustom: false },
  { id: 12, name: 'Leg Press', muscleGroup: 'Legs', equipmentType: 'Machine', isCustom: false },
  { id: 13, name: 'Squat (Barbell)', muscleGroup: 'Legs', equipmentType: 'Free Weight', isCustom: false },
  { id: 14, name: 'Leg Extension', muscleGroup: 'Legs', equipmentType: 'Machine', isCustom: false },
  { id: 15, name: 'Leg Curl', muscleGroup: 'Legs', equipmentType: 'Machine', isCustom: false },
  { id: 16, name: 'Calf Raise', muscleGroup: 'Legs', equipmentType: 'Machine', isCustom: false },
  { id: 17, name: 'Romanian Deadlift', muscleGroup: 'Legs', equipmentType: 'Free Weight', isCustom: false },
  { id: 18, name: 'Hack Squat', muscleGroup: 'Legs', equipmentType: 'Machine', isCustom: false },
  { id: 19, name: 'Shoulder Press (Dumbbell)', muscleGroup: 'Shoulders', equipmentType: 'Free Weight', isCustom: false },
  { id: 20, name: 'Shoulder Press Machine', muscleGroup: 'Shoulders', equipmentType: 'Machine', isCustom: false },
  { id: 21, name: 'Lateral Raise', muscleGroup: 'Shoulders', equipmentType: 'Free Weight', isCustom: false },
  { id: 22, name: 'Face Pull', muscleGroup: 'Shoulders', equipmentType: 'Cable', isCustom: false },
  { id: 23, name: 'Front Raise', muscleGroup: 'Shoulders', equipmentType: 'Free Weight', isCustom: false },
  { id: 24, name: 'Bicep Curl (Barbell)', muscleGroup: 'Arms', equipmentType: 'Free Weight', isCustom: false },
  { id: 25, name: 'Bicep Curl (Dumbbell)', muscleGroup: 'Arms', equipmentType: 'Free Weight', isCustom: false },
  { id: 26, name: 'Preacher Curl', muscleGroup: 'Arms', equipmentType: 'Machine', isCustom: false },
  { id: 27, name: 'Tricep Pushdown', muscleGroup: 'Arms', equipmentType: 'Cable', isCustom: false },
  { id: 28, name: 'Tricep Dips', muscleGroup: 'Arms', equipmentType: 'Bodyweight', isCustom: false },
  { id: 29, name: 'Overhead Tricep Extension', muscleGroup: 'Arms', equipmentType: 'Free Weight', isCustom: false },
  { id: 30, name: 'Hammer Curl', muscleGroup: 'Arms', equipmentType: 'Free Weight', isCustom: false }
];

function GymTracker() {
  const [currentView, setCurrentView] = useState('log');
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [currentSession, setCurrentSession] = useState({ exercises: [], notes: '' });
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showAddCustomExercise, setShowAddCustomExercise] = useState(false);
  const [restTimer, setRestTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [personalBests, setPersonalBests] = useState({});
  const [pinLocked, setPinLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: '',
    muscleGroup: 'Chest',
    equipmentType: 'Free Weight'
  });
  const [show1RMCalc, setShow1RMCalc] = useState(false);
  const [oneRMInput, setOneRMInput] = useState({ weight: '', reps: '' });
  const [editingSession, setEditingSession] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('gymSessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
    
    const savedPBs = localStorage.getItem('personalBests');
    if (savedPBs) {
      setPersonalBests(JSON.parse(savedPBs));
    }

    const savedExercises = localStorage.getItem('customExercises');
    const deletedDefaults = localStorage.getItem('deletedDefaultExercises');
    const deletedDefaultIds = deletedDefaults ? JSON.parse(deletedDefaults) : [];
    
    // Filter out deleted default exercises
    const activeDefaults = DEFAULT_EXERCISES.filter(ex => !deletedDefaultIds.includes(ex.id));
    
    if (savedExercises) {
      const customExercises = JSON.parse(savedExercises);
      setExercises([...activeDefaults, ...customExercises]);
    } else {
      setExercises(activeDefaults);
    }

    const pin = localStorage.getItem('gymPin');
    if (pin) {
      setPinLocked(true);
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('gymSessions', JSON.stringify(sessions));
      calculatePersonalBests();
    }
  }, [sessions]);

  // Save custom exercises
  useEffect(() => {
    const customExercises = exercises.filter(ex => ex.isCustom);
    if (customExercises.length > 0) {
      localStorage.setItem('customExercises', JSON.stringify(customExercises));
    }
  }, [exercises]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const playBeep = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const calculatePersonalBests = () => {
    const pbs = {};
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.reps && set.weight) {
            const key = exercise.exerciseId;
            const volume = set.reps * set.weight;
            if (!pbs[key] || volume > pbs[key].volume) {
              pbs[key] = { weight: set.weight, reps: set.reps, volume };
            }
          }
        });
      });
    });
    setPersonalBests(pbs);
    localStorage.setItem('personalBests', JSON.stringify(pbs));
  };

  const calculate1RM = (weight, reps) => {
    if (!weight || !reps || reps < 1) return null;
    // Epley formula: 1RM = weight × (1 + reps/30)
    return (parseFloat(weight) * (1 + parseFloat(reps) / 30)).toFixed(1);
  };

  const addExerciseToSession = (exercise) => {
    setCurrentSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: Array(6).fill({ reps: '', weight: '' })
      }]
    }));
    setShowExercisePicker(false);
  };

  const addCustomExercise = () => {
    if (!customExerciseForm.name.trim()) {
      alert('Please enter exercise name');
      return;
    }

    const newExercise = {
      id: Date.now(),
      name: customExerciseForm.name.trim(),
      muscleGroup: customExerciseForm.muscleGroup,
      equipmentType: customExerciseForm.equipmentType,
      isCustom: true
    };

    setExercises(prev => [...prev, newExercise]);
    setCustomExerciseForm({ name: '', muscleGroup: 'Chest', equipmentType: 'Free Weight' });
    setShowAddCustomExercise(false);
    alert(`Added "${newExercise.name}" to library!`);
  };

  const deleteExercise = (exerciseId) => {
    if (window.confirm('Remove this exercise from library? Your workout history will remain intact.')) {
      const updatedExercises = exercises.filter(ex => ex.id !== exerciseId);
      setExercises(updatedExercises);
      
      // Save all remaining exercises (both custom and defaults that weren't deleted)
      const customExercises = updatedExercises.filter(ex => ex.isCustom);
      const deletedDefaults = DEFAULT_EXERCISES.filter(defEx => 
        !updatedExercises.some(ex => ex.id === defEx.id)
      ).map(ex => ex.id);
      
      localStorage.setItem('customExercises', JSON.stringify(customExercises));
      localStorage.setItem('deletedDefaultExercises', JSON.stringify(deletedDefaults));
    }
  };

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setCurrentSession(prev => {
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const saveSession = () => {
    if (currentSession.exercises.length === 0) {
      alert('Add at least one exercise!');
      return;
    }

    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      exercises: currentSession.exercises.filter(ex => 
        ex.sets.some(set => set.reps && set.weight)
      ),
      notes: currentSession.notes
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSession({ exercises: [], notes: '' });
    alert('Workout saved! 💪');
  };

  const loadLastSession = () => {
    if (sessions.length === 0) {
      alert('No previous sessions to load');
      return;
    }
    
    const lastSession = sessions[0];
    setCurrentSession({
      exercises: lastSession.exercises.map(ex => ({
        ...ex,
        sets: Array(6).fill({ reps: '', weight: '' })
      })),
      notes: ''
    });
    alert('Last workout loaded as template!');
  };

  const startRestTimer = (seconds) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const stopRestTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const checkProgressiveOverload = (exerciseId, setData) => {
    if (!setData.reps || !setData.weight) return false;
    const pb = personalBests[exerciseId];
    if (!pb) return false;
    const currentVolume = setData.reps * setData.weight;
    return currentVolume > pb.volume;
  };

  const deleteExerciseFromSession = (index) => {
    setCurrentSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);
    
    const totalSets = weekSessions.reduce((acc, session) => 
      acc + session.exercises.reduce((exAcc, ex) => 
        exAcc + ex.sets.filter(s => s.reps && s.weight).length, 0
      ), 0
    );

    const totalVolume = weekSessions.reduce((acc, session) => 
      acc + session.exercises.reduce((exAcc, ex) => 
        exAcc + ex.sets.reduce((setAcc, set) => 
          setAcc + (set.reps && set.weight ? set.reps * set.weight : 0), 0
        ), 0
      ), 0
    );

    const volumeByMuscle = {};
    weekSessions.forEach(session => {
      session.exercises.forEach(ex => {
        if (!volumeByMuscle[ex.muscleGroup]) {
          volumeByMuscle[ex.muscleGroup] = 0;
        }
        ex.sets.forEach(set => {
          if (set.reps && set.weight) {
            volumeByMuscle[ex.muscleGroup] += set.reps * set.weight;
          }
        });
      });
    });

    const chartData = Object.entries(volumeByMuscle).map(([muscle, volume]) => ({
      muscle,
      volume: Math.round(volume)
    }));

    return {
      totalSets,
      totalVolume: Math.round(totalVolume),
      daysWorked: weekSessions.length,
      volumeByMuscle: chartData,
      weekSessions
    };
  };

  const downloadWeeklyReportPDF = async () => {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf');
    
    const stats = getWeeklyStats();
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text("ANKIT'S GYM LOG", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Weekly Report', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    doc.text(`${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`, 105, 37, { align: 'center' });
    
    // Summary Stats
    let y = 50;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 20, y);
    y += 10;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Days Trained: ${stats.daysWorked}`, 20, y);
    y += 7;
    doc.text(`Total Sets: ${stats.totalSets}`, 20, y);
    y += 7;
    doc.text(`Total Volume: ${stats.totalVolume} kg`, 20, y);
    y += 15;
    
    // Volume by Muscle Group
    doc.setFont(undefined, 'bold');
    doc.text('Volume by Muscle Group', 20, y);
    y += 10;
    
    doc.setFont(undefined, 'normal');
    stats.volumeByMuscle.forEach(item => {
      doc.text(`${item.muscle}: ${item.volume} kg`, 20, y);
      y += 7;
    });
    
    y += 10;
    
    // Workout Sessions
    if (stats.weekSessions.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('Workout Sessions', 20, y);
      y += 10;
      
      doc.setFont(undefined, 'normal');
      stats.weekSessions.forEach((session, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(`${new Date(session.date).toLocaleDateString()}`, 20, y);
        y += 7;
        
        doc.setFont(undefined, 'normal');
        session.exercises.forEach(ex => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          const completedSets = ex.sets.filter(s => s.reps && s.weight);
          const setsText = completedSets.map(s => `${s.reps}×${s.weight}kg`).join(', ');
          doc.text(`  ${ex.exerciseName}: ${setsText}`, 25, y);
          y += 6;
        });
        
        y += 5;
      });
    }
    
    // Save PDF
    doc.save(`ankits-gym-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getLast28Days = () => {
    const days = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const hasWorkout = sessions.some(s => s.date.split('T')[0] === dateStr);
      days.push({ date: dateStr, hasWorkout });
    }
    return days;
  };

  const handlePinSubmit = () => {
    const savedPin = localStorage.getItem('gymPin');
    if (!savedPin) {
      localStorage.setItem('gymPin', pinInput);
      setPinLocked(false);
      setPinInput('');
    } else if (pinInput === savedPin) {
      setPinLocked(false);
      setPinInput('');
    } else {
      alert('Wrong PIN!');
      setPinInput('');
    }
  };

  const startEditingSession = (session) => {
    setEditingSession({ ...session });
    setShowEditModal(true);
  };

  const updateEditSet = (exerciseIndex, setIndex, field, value) => {
    setEditingSession(prev => {
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const saveEditedSession = () => {
    const updatedSessions = sessions.map(s => 
      s.id === editingSession.id ? editingSession : s
    );
    setSessions(updatedSessions);
    setShowEditModal(false);
    setEditingSession(null);
    alert('Workout updated! 💪');
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Delete this workout? This cannot be undone.')) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      alert('Workout deleted');
    }
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (pinLocked) {
    return (
      <div className="app">
        <div className="pin-screen">
          <div className="pin-container">
            <div className="pin-icon">🔒</div>
            <h2>ENTER PIN</h2>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="****"
              className="pin-input"
              autoFocus
            />
            <button onClick={handlePinSubmit} className="pin-btn">
              {localStorage.getItem('gymPin') ? 'UNLOCK' : 'SET PIN'}
            </button>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ANKIT'S GYM LOG</h1>
        <div className="header-subtitle">TRACK. PUSH. GROW.</div>
      </header>

      <main className="main-content">
        {/* LOG VIEW */}
        {currentView === 'log' && (
          <div className="view">
            <div className="view-header">
              <h2>LOG WORKOUT</h2>
              <div className="quick-actions">
                <button onClick={loadLastSession} className="btn-secondary">
                  ⟲ RE-LOG LAST
                </button>
              </div>
            </div>

            {currentSession.exercises.map((exercise, exIndex) => (
              <div key={exIndex} className="exercise-card">
                <div className="exercise-header">
                  <div>
                    <h3>{exercise.exerciseName}</h3>
                    <span className="muscle-tag">{exercise.muscleGroup}</span>
                  </div>
                  <button 
                    onClick={() => deleteExerciseFromSession(exIndex)}
                    className="btn-delete"
                  >
                    ✕
                  </button>
                </div>

                <div className="sets-grid">
                  <div className="set-header">
                    <span>SET</span>
                    <span>KG</span>
                    <span>REPS</span>
                  </div>
                  {exercise.sets.map((set, setIndex) => {
                    const isNewPR = checkProgressiveOverload(exercise.exerciseId, set);
                    return (
                      <div 
                        key={setIndex} 
                        className={`set-row ${isNewPR ? 'pr-highlight' : ''}`}
                      >
                        <span className="set-number">{setIndex + 1}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                          placeholder="0"
                          className="set-input"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                          placeholder="0"
                          className="set-input"
                        />
                        {isNewPR && <span className="pr-badge">PR!</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button 
              onClick={() => setShowExercisePicker(true)}
              className="btn-add-exercise"
            >
              + ADD EXERCISE
            </button>

            <textarea
              value={currentSession.notes}
              onChange={(e) => setCurrentSession(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Session notes..."
              className="notes-input"
              rows="3"
            />

            <button onClick={saveSession} className="btn-primary btn-save">
              COMPLETE WORKOUT
            </button>

            {/* Rest Timer */}
            <div className="rest-timer">
              <h3>REST TIMER</h3>
              <div className="timer-display">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="timer-controls">
                {!isTimerRunning ? (
                  <>
                    <button onClick={() => startRestTimer(60)} className="timer-btn">60s</button>
                    <button onClick={() => startRestTimer(90)} className="timer-btn">90s</button>
                    <button onClick={() => startRestTimer(120)} className="timer-btn">120s</button>
                  </>
                ) : (
                  <button onClick={stopRestTimer} className="timer-btn timer-btn-stop">STOP</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {currentView === 'history' && (
          <div className="view">
            <h2>WORKOUT HISTORY</h2>
            {sessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No workouts logged yet</p>
              </div>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="history-card">
                  <div className="history-header">
                    <span className="history-date">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <div className="history-actions">
                      <span className="history-count">
                        {session.exercises.length} exercises
                      </span>
                      <button 
                        onClick={() => startEditingSession(session)}
                        className="btn-edit-small"
                        title="Edit workout"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => deleteSession(session.id)}
                        className="btn-delete-tiny"
                        title="Delete workout"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {session.exercises.map((ex, idx) => (
                    <div key={idx} className="history-exercise">
                      <strong>{ex.exerciseName}</strong>
                      <div className="history-sets">
                        {ex.sets.filter(s => s.reps && s.weight).map((set, i) => (
                          <span key={i} className="history-set-badge">
                            {set.reps}×{set.weight}kg
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {session.notes && (
                    <div className="history-notes">{session.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* REPORT VIEW */}
        {currentView === 'report' && (
          <div className="view">
            <div className="view-header">
              <h2>WEEKLY REPORT</h2>
              <button onClick={downloadWeeklyReportPDF} className="btn-secondary">
                📥 PDF
              </button>
            </div>
            {(() => {
              const stats = getWeeklyStats();
              return (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalSets}</div>
                      <div className="stat-label">Total Sets</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalVolume}</div>
                      <div className="stat-label">Total Volume (kg)</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.daysWorked}</div>
                      <div className="stat-label">Days Trained</div>
                    </div>
                  </div>

                  {stats.volumeByMuscle.length > 0 && (
                    <div className="chart-container">
                      <h3>Volume by Muscle Group</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stats.volumeByMuscle}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="muscle" stroke="#fff" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#fff" />
                          <Tooltip 
                            contentStyle={{ background: '#1a1a1a', border: '1px solid #39ff14' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="volume" fill="#39ff14" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="streak-calendar">
                    <h3>Last 28 Days</h3>
                    <div className="calendar-grid">
                      {getLast28Days().map((day, i) => (
                        <div 
                          key={i}
                          className={`calendar-day ${day.hasWorkout ? 'workout-day' : ''}`}
                          title={day.date}
                        >
                          {new Date(day.date).getDate()}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 1RM Calculator */}
                  <div className="rm-calculator">
                    <h3>1 REP MAX CALCULATOR</h3>
                    <p className="rm-subtitle">Using Epley Formula</p>
                    <div className="rm-inputs">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={oneRMInput.weight}
                        onChange={(e) => setOneRMInput(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="Weight (kg)"
                        className="rm-input"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={oneRMInput.reps}
                        onChange={(e) => setOneRMInput(prev => ({ ...prev, reps: e.target.value }))}
                        placeholder="Reps"
                        className="rm-input"
                      />
                    </div>
                    {oneRMInput.weight && oneRMInput.reps && (
                      <div className="rm-result">
                        <span className="rm-label">Estimated 1RM:</span>
                        <span className="rm-value">
                          {calculate1RM(oneRMInput.weight, oneRMInput.reps)} kg
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* EXERCISES VIEW */}
        {currentView === 'exercises' && (
          <div className="view">
            <div className="view-header">
              <h2>EXERCISE LIBRARY</h2>
              <button 
                onClick={() => setShowAddCustomExercise(true)}
                className="btn-secondary"
              >
                + NEW
              </button>
            </div>
            <div className="info-banner">
              <span>💡</span>
              <span>Tap 🗑️ to delete any exercise from your library</span>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exercises..."
              className="search-input"
            />
            <div className="exercise-list">
              {Object.entries(
                filteredExercises.reduce((acc, ex) => {
                  if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
                  acc[ex.muscleGroup].push(ex);
                  return acc;
                }, {})
              ).map(([muscle, exs]) => (
                <div key={muscle} className="exercise-group">
                  <h3 className="group-title">{muscle}</h3>
                  {exs.map(ex => {
                    const pb = personalBests[ex.id];
                    return (
                      <div key={ex.id} className="exercise-item">
                        <div>
                          <div className="exercise-name">{ex.name}</div>
                          <div className="exercise-type">{ex.equipmentType}</div>
                          {pb && (
                            <>
                              <div className="exercise-pb">
                                PR: {pb.reps}×{pb.weight}kg
                              </div>
                              <div className="exercise-1rm">
                                Est. 1RM: {calculate1RM(pb.weight, pb.reps)}kg
                              </div>
                            </>
                          )}
                        </div>
                        <button 
                          onClick={() => deleteExercise(ex.id)}
                          className="btn-delete-small"
                          title="Delete exercise"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="modal-overlay" onClick={() => setShowExercisePicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>SELECT EXERCISE</h2>
              <button onClick={() => setShowExercisePicker(false)} className="modal-close">✕</button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="search-input"
              autoFocus
            />
            <button 
              onClick={() => {
                setShowExercisePicker(false);
                setShowAddCustomExercise(true);
              }}
              className="btn-create-new-exercise"
            >
              + CREATE NEW EXERCISE
            </button>
            <div className="modal-content">
              {Object.entries(
                filteredExercises.reduce((acc, ex) => {
                  if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
                  acc[ex.muscleGroup].push(ex);
                  return acc;
                }, {})
              ).map(([muscle, exs]) => (
                <div key={muscle} className="exercise-group">
                  <h3 className="group-title">{muscle}</h3>
                  {exs.map(ex => (
                    <div 
                      key={ex.id} 
                      className="exercise-item clickable"
                      onClick={() => addExerciseToSession(ex)}
                    >
                      <div>
                        <div className="exercise-name">{ex.name}</div>
                        <div className="exercise-type">{ex.equipmentType}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddCustomExercise && (
        <div className="modal-overlay" onClick={() => setShowAddCustomExercise(false)}>
          <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>CREATE EXERCISE</h2>
              <button onClick={() => setShowAddCustomExercise(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-content">
              <p className="helper-text">Add to your personal exercise library. You can delete it later from the Exercises tab.</p>
              <div className="form-group">
                <label>Exercise Name</label>
                <input
                  type="text"
                  value={customExerciseForm.name}
                  onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Smith Machine Squat"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Muscle Group</label>
                <select
                  value={customExerciseForm.muscleGroup}
                  onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                  className="form-select"
                >
                  <option value="Chest">Chest</option>
                  <option value="Back">Back</option>
                  <option value="Legs">Legs</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Arms">Arms</option>
                  <option value="Core">Core</option>
                </select>
              </div>
              <div className="form-group">
                <label>Equipment Type</label>
                <select
                  value={customExerciseForm.equipmentType}
                  onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, equipmentType: e.target.value }))}
                  className="form-select"
                >
                  <option value="Free Weight">Free Weight</option>
                  <option value="Machine">Machine</option>
                  <option value="Cable">Cable</option>
                  <option value="Bodyweight">Bodyweight</option>
                </select>
              </div>
              <button onClick={addCustomExercise} className="btn-primary">
                ADD TO LIBRARY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workout Modal */}
      {showEditModal && editingSession && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT WORKOUT</h2>
              <button onClick={() => setShowEditModal(false)} className="modal-close">✕</button>
            </div>
            <div className="modal-content">
              <div className="edit-date">
                {new Date(editingSession.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              
              {editingSession.exercises.map((exercise, exIndex) => (
                <div key={exIndex} className="exercise-card">
                  <div className="exercise-header">
                    <div>
                      <h3>{exercise.exerciseName}</h3>
                      <span className="muscle-tag">{exercise.muscleGroup}</span>
                    </div>
                  </div>

                  <div className="sets-grid">
                    <div className="set-header">
                      <span>SET</span>
                      <span>KG</span>
                      <span>REPS</span>
                    </div>
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="set-row">
                        <span className="set-number">{setIndex + 1}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) => updateEditSet(exIndex, setIndex, 'weight', e.target.value)}
                          placeholder="0"
                          className="set-input"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e) => updateEditSet(exIndex, setIndex, 'reps', e.target.value)}
                          placeholder="0"
                          className="set-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <textarea
                value={editingSession.notes || ''}
                onChange={(e) => setEditingSession(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Session notes..."
                className="notes-input"
                rows="3"
              />

              <button onClick={saveEditedSession} className="btn-primary">
                SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          onClick={() => setCurrentView('log')}
          className={currentView === 'log' ? 'active' : ''}
        >
          <span className="nav-icon">✏️</span>
          <span>Log</span>
        </button>
        <button 
          onClick={() => setCurrentView('history')}
          className={currentView === 'history' ? 'active' : ''}
        >
          <span className="nav-icon">📋</span>
          <span>History</span>
        </button>
        <button 
          onClick={() => setCurrentView('report')}
          className={currentView === 'report' ? 'active' : ''}
        >
          <span className="nav-icon">📊</span>
          <span>Report</span>
        </button>
        <button 
          onClick={() => setCurrentView('exercises')}
          className={currentView === 'exercises' ? 'active' : ''}
        >
          <span className="nav-icon">💪</span>
          <span>Exercises</span>
        </button>
      </nav>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Rajdhani', sans-serif;
    background: #0a0a0a;
    color: #fff;
    overflow-x: hidden;
  }

  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    position: relative;
  }

  .app::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      repeating-linear-gradient(
        0deg,
        rgba(57, 255, 20, 0.03) 0px,
        transparent 1px,
        transparent 2px,
        rgba(57, 255, 20, 0.03) 3px
      );
    pointer-events: none;
    z-index: 1;
  }

  .header {
    background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
    padding: 20px;
    text-align: center;
    border-bottom: 2px solid #39ff14;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(57, 255, 20, 0.2);
  }

  .header h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.5rem;
    letter-spacing: 4px;
    color: #39ff14;
    text-shadow: 0 0 20px rgba(57, 255, 20, 0.5);
  }

  .header-subtitle {
    font-size: 0.9rem;
    letter-spacing: 3px;
    color: #888;
    margin-top: 5px;
  }

  .main-content {
    padding: 20px 20px 100px 20px;
    max-width: 600px;
    margin: 0 auto;
    position: relative;
    z-index: 2;
  }

  .view {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .view h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.8rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 20px;
  }

  .quick-actions {
    display: flex;
    gap: 10px;
  }

  .btn-secondary {
    background: #2a2a2a;
    color: #39ff14;
    border: 1px solid #39ff14;
    padding: 8px 16px;
    border-radius: 4px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-secondary:active {
    transform: scale(0.95);
    background: #39ff14;
    color: #0a0a0a;
  }

  .exercise-card {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-left: 4px solid #39ff14;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .exercise-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .exercise-header h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
  }

  .muscle-tag {
    display: inline-block;
    background: #2a2a2a;
    color: #39ff14;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.75rem;
    margin-top: 6px;
    font-weight: 600;
  }

  .btn-delete {
    background: #ff3333;
    color: #fff;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-delete:active {
    transform: scale(0.9);
    background: #cc0000;
  }

  .btn-delete-small {
    background: #ff3333;
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-delete-small:active {
    transform: scale(0.95);
    background: #cc0000;
  }

  .sets-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .set-header {
    display: grid;
    grid-template-columns: 40px 1fr 1fr;
    gap: 8px;
    padding: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .set-row {
    display: grid;
    grid-template-columns: 40px 1fr 1fr;
    gap: 8px;
    align-items: center;
    padding: 8px;
    background: #0a0a0a;
    border-radius: 6px;
    border: 1px solid #2a2a2a;
    transition: all 0.2s;
    position: relative;
  }

  .set-row.pr-highlight {
    background: linear-gradient(135deg, rgba(57, 255, 20, 0.2) 0%, rgba(57, 255, 20, 0.05) 100%);
    border-color: #39ff14;
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  }

  .set-number {
    font-weight: 700;
    font-size: 1.1rem;
    color: #39ff14;
    text-align: center;
  }

  .set-input {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.1rem;
    font-weight: 600;
    text-align: center;
    transition: all 0.2s;
  }

  .set-input:focus {
    outline: none;
    border-color: #39ff14;
    box-shadow: 0 0 10px rgba(57, 255, 20, 0.3);
  }

  .pr-badge {
    position: absolute;
    right: -10px;
    top: -10px;
    background: #39ff14;
    color: #0a0a0a;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .btn-add-exercise {
    width: 100%;
    background: #2a2a2a;
    color: #39ff14;
    border: 2px dashed #39ff14;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    margin: 16px 0;
    transition: all 0.2s;
  }

  .btn-add-exercise:active {
    transform: scale(0.98);
    background: #39ff14;
    color: #0a0a0a;
  }

  .notes-input {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #fff;
    padding: 12px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    margin: 16px 0;
    resize: vertical;
  }

  .notes-input:focus {
    outline: none;
    border-color: #39ff14;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, #39ff14 0%, #2dd60f 100%);
    color: #0a0a0a;
    border: none;
    padding: 18px;
    border-radius: 8px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.4rem;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(57, 255, 20, 0.4);
    transition: all 0.2s;
  }

  .btn-primary:active {
    transform: translateY(2px);
    box-shadow: 0 2px 10px rgba(57, 255, 20, 0.4);
  }

  .btn-save {
    margin-top: 20px;
  }

  .rest-timer {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
    text-align: center;
  }

  .rest-timer h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 12px;
  }

  .timer-display {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 3rem;
    color: #fff;
    margin: 16px 0;
    text-shadow: 0 0 20px rgba(57, 255, 20, 0.5);
  }

  .timer-controls {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .timer-btn {
    background: #2a2a2a;
    color: #39ff14;
    border: 1px solid #39ff14;
    padding: 12px 24px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timer-btn:active {
    transform: scale(0.95);
    background: #39ff14;
    color: #0a0a0a;
  }

  .timer-btn-stop {
    background: #ff3333;
    color: #fff;
    border-color: #ff3333;
  }

  .timer-btn-stop:active {
    background: #cc0000;
  }

  .history-card {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-left: 4px solid #39ff14;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #2a2a2a;
  }

  .history-date {
    font-weight: 700;
    font-size: 1.1rem;
    color: #39ff14;
  }

  .history-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .history-count {
    color: #888;
    font-size: 0.9rem;
  }

  .btn-edit-small {
    background: #2a2a2a;
    color: #39ff14;
    border: 1px solid #39ff14;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-edit-small:active {
    transform: scale(0.95);
    background: #39ff14;
    color: #0a0a0a;
  }

  .btn-delete-tiny {
    background: #ff3333;
    color: #fff;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-delete-tiny:active {
    transform: scale(0.95);
    background: #cc0000;
  }

  .modal-large {
    max-width: 600px;
    max-height: 85vh;
  }

  .edit-date {
    background: #2a2a2a;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    text-align: center;
    font-weight: 700;
    color: #39ff14;
  }

  .history-exercise {
    margin-bottom: 12px;
  }

  .history-exercise strong {
    display: block;
    margin-bottom: 6px;
    color: #fff;
  }

  .history-sets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .history-set-badge {
    background: #2a2a2a;
    color: #39ff14;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .history-notes {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #2a2a2a;
    color: #888;
    font-style: italic;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.3;
  }

  .empty-state p {
    color: #888;
    font-size: 1.1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .stat-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2rem;
    color: #39ff14;
    text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
  }

  .stat-label {
    font-size: 0.75rem;
    color: #888;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .chart-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .chart-container h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 16px;
  }

  .streak-calendar {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .streak-calendar h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 16px;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }

  .calendar-day {
    aspect-ratio: 1;
    background: #2a2a2a;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    color: #666;
    transition: all 0.2s;
  }

  .calendar-day.workout-day {
    background: #39ff14;
    color: #0a0a0a;
    font-weight: 700;
    box-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
  }

  .rm-calculator {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 20px;
  }

  .rm-calculator h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 8px;
  }

  .rm-subtitle {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 16px;
  }

  .rm-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .rm-input {
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
  }

  .rm-input:focus {
    outline: none;
    border-color: #39ff14;
  }

  .rm-result {
    background: #2a2a2a;
    border: 2px solid #39ff14;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rm-label {
    font-size: 1rem;
    color: #888;
  }

  .rm-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2rem;
    color: #39ff14;
    text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
  }

  .search-input {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    color: #fff;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    margin-bottom: 16px;
  }

  .info-banner {
    background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
    border: 1px solid #39ff14;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    color: #39ff14;
  }

  .info-banner span:first-child {
    font-size: 1.2rem;
  }

  .search-input:focus {
    outline: none;
    border-color: #39ff14;
  }

  .btn-create-new-exercise {
    width: calc(100% - 40px);
    margin: 0 20px 16px 20px;
    background: linear-gradient(135deg, #39ff14 0%, #2dd60f 100%);
    color: #0a0a0a;
    border: none;
    padding: 14px;
    border-radius: 8px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 2px 10px rgba(57, 255, 20, 0.3);
  }

  .btn-create-new-exercise:active {
    transform: scale(0.98);
    box-shadow: 0 1px 5px rgba(57, 255, 20, 0.3);
  }

  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .exercise-group {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 16px;
  }

  .group-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.4rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #2a2a2a;
  }

  .exercise-item {
    padding: 12px;
    border-bottom: 1px solid #1a1a1a;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .exercise-item:last-child {
    border-bottom: none;
  }

  .exercise-item.clickable {
    cursor: pointer;
  }

  .exercise-item.clickable:active {
    background: #2a2a2a;
    transform: translateX(4px);
  }

  .exercise-name {
    font-weight: 700;
    font-size: 1rem;
    color: #fff;
    margin-bottom: 4px;
  }

  .exercise-type {
    font-size: 0.85rem;
    color: #888;
  }

  .exercise-pb {
    margin-top: 6px;
    font-size: 0.85rem;
    color: #39ff14;
    font-weight: 600;
  }

  .exercise-1rm {
    margin-top: 4px;
    font-size: 0.8rem;
    color: #888;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 2px solid #39ff14;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(57, 255, 20, 0.3);
  }

  .modal-small {
    max-width: 400px;
    max-height: none;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #2a2a2a;
  }

  .modal-header h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.5rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .modal-close:active {
    transform: scale(0.9);
    color: #39ff14;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .helper-text {
    background: #2a2a2a;
    border-left: 3px solid #39ff14;
    padding: 12px;
    margin-bottom: 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #888;
    line-height: 1.5;
  }

  .form-group label {
    display: block;
    font-weight: 700;
    font-size: 0.9rem;
    color: #39ff14;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .form-input, .form-select {
    width: 100%;
    background: #0a0a0a;
    border: 1px solid #2a2a2a;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 1rem;
    font-weight: 600;
  }

  .form-input:focus, .form-select:focus {
    outline: none;
    border-color: #39ff14;
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(180deg, rgba(26, 26, 26, 0.95) 0%, rgba(13, 13, 13, 0.98) 100%);
    backdrop-filter: blur(10px);
    border-top: 2px solid #39ff14;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 8px;
    z-index: 100;
    box-shadow: 0 -4px 20px rgba(57, 255, 20, 0.2);
  }

  .bottom-nav button {
    background: none;
    border: none;
    color: #888;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-family: 'Rajdhani', sans-serif;
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .bottom-nav button.active {
    color: #39ff14;
  }

  .bottom-nav button:active {
    transform: scale(0.95);
  }

  .nav-icon {
    font-size: 1.5rem;
  }

  .pin-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }

  .pin-container {
    background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
    border: 2px solid #39ff14;
    border-radius: 12px;
    padding: 40px 30px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(57, 255, 20, 0.3);
    max-width: 300px;
    width: 100%;
  }

  .pin-icon {
    font-size: 3rem;
    margin-bottom: 20px;
  }

  .pin-container h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.8rem;
    letter-spacing: 2px;
    color: #39ff14;
    margin-bottom: 20px;
  }

  .pin-input {
    width: 100%;
    background: #0a0a0a;
    border: 2px solid #2a2a2a;
    color: #fff;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2rem;
    text-align: center;
    letter-spacing: 8px;
    margin-bottom: 20px;
  }

  .pin-input:focus {
    outline: none;
    border-color: #39ff14;
    box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  }

  .pin-btn {
    width: 100%;
    background: linear-gradient(135deg, #39ff14 0%, #2dd60f 100%);
    color: #0a0a0a;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.4rem;
    letter-spacing: 2px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(57, 255, 20, 0.4);
    transition: all 0.2s;
  }

  .pin-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 10px rgba(57, 255, 20, 0.4);
  }

  @media (max-width: 400px) {
    .header h1 {
      font-size: 2rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .set-header span,
    .set-number {
      font-size: 0.75rem;
    }

    .set-input {
      padding: 10px;
      font-size: 1rem;
    }
  }
`;

export default GymTracker;
