import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '/api';

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
    equipmentType: 'Free Weight',
    trackingType: 'weight_reps'
  });
  const [editingSession, setEditingSession] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Enhanced features
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [durationTimers, setDurationTimers] = useState({});
  
  // NEW: Calendar filtering
  const [selectedDate, setSelectedDate] = useState(null);

  // Load data from API on mount
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setSyncStatus('syncing');
      
      const exercisesRes = await fetch(`${API_BASE}/exercises`);
      if (exercisesRes.ok) {
        const exercisesData = await exercisesRes.json();
        setExercises(exercisesData);
      }
      
      const sessionsRes = await fetch(`${API_BASE}/sessions`);
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }
      
      const statsRes = await fetch(`${API_BASE}/stats`);
      if (statsRes.ok) {
        const statsData = await sessionsRes.json();
        setPersonalBests(statsData);
      }
      
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setSyncStatus('error');
      setLoading(false);
    }
  };

  // NEW: Get last session for an exercise (for showing previous performance)
  const getLastSessionForExercise = (exerciseId) => {
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (session.exercises) {
        const uniqueExercises = {};
        session.exercises.forEach(ex => {
          if (!uniqueExercises[ex.exerciseId]) {
            uniqueExercises[ex.exerciseId] = ex;
          }
        });
        
        const exerciseData = uniqueExercises[exerciseId];
        if (exerciseData && exerciseData.sets && exerciseData.sets.length > 0) {
          const bestSet = exerciseData.sets.reduce((best, current) => {
            if (exerciseData.trackingType === 'weight_reps') {
              const currentVolume = (current.weight || 0) * (current.reps || 0);
              const bestVolume = (best.weight || 0) * (best.reps || 0);
              return currentVolume > bestVolume ? current : best;
            }
            if (exerciseData.trackingType === 'reps_only') {
              return (current.reps || 0) > (best.reps || 0) ? current : best;
            }
            if (exerciseData.trackingType === 'duration') {
              return (current.duration || 0) > (best.duration || 0) ? current : best;
            }
            if (exerciseData.trackingType === 'distance') {
              return (current.distance || 0) > (best.distance || 0) ? current : best;
            }
            return best;
          });
          
          return {
            ...bestSet,
            date: session.date,
            trackingType: exerciseData.trackingType
          };
        }
      }
    }
    return null;
  };

  const saveSession = async () => {
    if (currentSession.exercises.length === 0) {
      alert('Add at least one exercise to your workout!');
      return;
    }

    const hasData = currentSession.exercises.some(ex => 
      ex.sets.some(set => {
        if (ex.trackingType === 'weight_reps') return set.reps && set.weight;
        if (ex.trackingType === 'reps_only') return set.reps;
        if (ex.trackingType === 'duration') return set.duration;
        if (ex.trackingType === 'distance') return set.distance;
        return false;
      })
    );

    if (!hasData) {
      alert('Enter at least one set with data!');
      return;
    }

    try {
      setSyncStatus('syncing');
      
      const sessionData = {
        date: new Date().toISOString().split('T')[0],
        exercises: currentSession.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(set => {
            if (ex.trackingType === 'weight_reps') return set.reps && set.weight;
            if (ex.trackingType === 'reps_only') return set.reps;
            if (ex.trackingType === 'duration') return set.duration;
            if (ex.trackingType === 'distance') return set.distance;
            return false;
          })
        })).filter(ex => ex.sets.length > 0),
        notes: currentSession.notes
      };

      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (res.ok) {
        await loadData();
        setCurrentSession({ exercises: [], notes: '' });
        setDurationTimers({});
        alert('💪 Workout saved successfully!');
      }
    } catch (err) {
      console.error('Error saving:', err);
      setSyncStatus('error');
      alert('Failed to save workout. Please try again.');
    }
  };

  const updateSession = async () => {
    if (!editingSession) return;

    try {
      setSyncStatus('syncing');
      
      const sessionData = {
        id: editingSession.id,
        date: editingSession.date,
        exercises: editingSession.exercises.map(ex => ({
          ...ex,
          sets: ex.sets.filter(set => {
            if (ex.trackingType === 'weight_reps') return set.reps && set.weight;
            if (ex.trackingType === 'reps_only') return set.reps;
            if (ex.trackingType === 'duration') return set.duration;
            if (ex.trackingType === 'distance') return set.distance;
            return false;
          })
        })).filter(ex => ex.sets.length > 0),
        notes: editingSession.notes || ''
      };

      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (res.ok) {
        await loadData();
        setEditingSession(null);
        setShowEditModal(false);
        alert('✅ Workout updated!');
      }
    } catch (err) {
      console.error('Error updating:', err);
      setSyncStatus('error');
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;
    
    try {
      setSyncStatus('syncing');
      const res = await fetch(`${API_BASE}/sessions?id=${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setSyncStatus('error');
    }
  };

  const addExerciseToSession = (exercise) => {
    const newExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      trackingType: exercise.trackingType || 'weight_reps',
      sets: Array(6).fill(null).map(() => {
        if (exercise.trackingType === 'weight_reps') return { reps: '', weight: '' };
        if (exercise.trackingType === 'reps_only') return { reps: '' };
        if (exercise.trackingType === 'duration') return { duration: '' };
        if (exercise.trackingType === 'distance') return { distance: '' };
        return { reps: '', weight: '' };
      })
    };
    
    setCurrentSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
    setShowExercisePicker(false);
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

  const updateEditSet = (exerciseIndex, setIndex, field, value) => {
    setEditingSession(prev => {
      const newExercises = [...prev.exercises];
      const newSets = [...newExercises[exerciseIndex].sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
      return { ...prev, exercises: newExercises };
    });
  };

  const removeExerciseFromSession = (index) => {
    setCurrentSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };

  // Duration timer - COUNTDOWN version
  const startDurationTimer = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const targetDuration = parseInt(currentSession.exercises[exerciseIndex].sets[setIndex].duration);
    
    if (!targetDuration || targetDuration <= 0) {
      alert('Enter target duration first!');
      return;
    }
    
    const startTime = Date.now();
    const endTime = startTime + (targetDuration * 1000);
    
    setDurationTimers(prev => ({
      ...prev,
      [key]: { startTime, endTime, targetDuration, running: true }
    }));
  };

  const stopDurationTimer = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const timer = durationTimers[key];
    
    if (timer && timer.running) {
      const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
      updateSet(exerciseIndex, setIndex, 'duration', elapsed.toString());
      
      setDurationTimers(prev => ({
        ...prev,
        [key]: { ...prev[key], running: false }
      }));
    }
  };

  const getDurationTimerDisplay = (exerciseIndex, setIndex) => {
    const key = `${exerciseIndex}-${setIndex}`;
    const timer = durationTimers[key];
    
    if (timer && timer.running) {
      const remaining = Math.max(0, Math.floor((timer.endTime - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      
      if (remaining === 0) {
        stopDurationTimer(exerciseIndex, setIndex);
        playBeep();
      }
      
      return { text: `${mins}:${secs.toString().padStart(2, '0')}`, remaining, total: timer.targetDuration };
    }
    return null;
  };

  // Force re-render for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      const hasRunningTimer = Object.values(durationTimers).some(t => t.running);
      if (hasRunningTimer) {
        setDurationTimers(prev => ({ ...prev }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [durationTimers]);

  const addCustomExercise = async () => {
    if (!customExerciseForm.name.trim()) {
      alert('Please enter an exercise name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customExerciseForm)
      });

      if (res.ok) {
        await loadData();
        setCustomExerciseForm({
          name: '',
          muscleGroup: 'Chest',
          equipmentType: 'Free Weight',
          trackingType: 'weight_reps'
        });
        setShowAddCustomExercise(false);
        alert('✅ Exercise added!');
      }
    } catch (err) {
      console.error('Error adding exercise:', err);
      alert('Failed to add exercise');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '0m';
    return `${meters}m`;
  };

  const calculate1RM = (weight, reps) => {
    return Math.round(weight * (1 + reps / 30));
  };

  // Export to text file
  const exportToPDF = () => {
    try {
      let content = "ANKIT'S GYM LOG\n";
      content += "=".repeat(50) + "\n\n";
      
      sessions.slice(0, 20).forEach(session => {
        const date = new Date(session.date).toLocaleDateString();
        content += `📅 ${date}\n`;
        content += "-".repeat(50) + "\n";
        
        if (session.exercises) {
          const uniqueExercises = {};
          session.exercises.forEach(ex => {
            if (!uniqueExercises[ex.exerciseId]) {
              uniqueExercises[ex.exerciseId] = ex;
            }
          });
          
          Object.values(uniqueExercises).forEach(ex => {
            content += `\n${ex.exerciseName}\n`;
            
            if (ex.sets && ex.sets.length > 0) {
              ex.sets.forEach((set, i) => {
                let setInfo = `  Set ${i + 1}: `;
                if (ex.trackingType === 'weight_reps') setInfo += `${set.weight}kg × ${set.reps} reps`;
                if (ex.trackingType === 'reps_only') setInfo += `${set.reps} reps`;
                if (ex.trackingType === 'duration') setInfo += formatDuration(set.duration);
                if (ex.trackingType === 'distance') setInfo += formatDistance(set.distance);
                content += setInfo + "\n";
              });
            }
          });
        }
        
        if (session.notes) {
          content += `\n📝 Notes: ${session.notes}\n`;
        }
        content += "\n" + "=".repeat(50) + "\n\n";
      });
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gym-log.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('✅ Workout log exported as text file!');
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export. Error: ' + err.message);
    }
  };

  // Rest timer (between sets)
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

  const startRestTimer = (seconds) => {
    setRestTimer(seconds);
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const playBeep = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiqG0fPTgjMGHm7A7+OZRQ0PVa3n7K1aEwlDm9zsw2seBCZ+zPLZii8GIG/B7+WYRQwOVa3n6KxaEwhCnNvvwWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwOVa3n56xaEwhBnNvsyWseBSZ9zfPaizAGIG/B7+WZRgwO');
    audio.play().catch(() => {});
  };

  // Sync indicator component
  const SyncIndicator = () => {
    const getStatusColor = () => {
      if (syncStatus === 'synced') return '#39ff14';
      if (syncStatus === 'syncing') return '#ffaa00';
      return '#ff3333';
    };

    const getStatusIcon = () => {
      if (syncStatus === 'synced') return '✓';
      if (syncStatus === 'syncing') return '⟳';
      return '✗';
    };

    const getStatusText = () => {
      if (syncStatus === 'synced' && lastSyncTime) {
        const secondsAgo = Math.floor((Date.now() - lastSyncTime) / 1000);
        if (secondsAgo < 60) return 'Synced';
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
        return `${Math.floor(secondsAgo / 3600)}h ago`;
      }
      if (syncStatus === 'syncing') return 'Syncing...';
      return 'Error';
    };

    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#1a1a1a',
        border: `2px solid ${getStatusColor()}`,
        borderRadius: '20px',
        padding: '8px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        fontSize: '0.9rem'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(),
          animation: syncStatus === 'syncing' ? 'pulse 1s infinite' : 'none'
        }}></div>
        <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>{getStatusIcon()}</span>
        <span style={{ color: '#fff' }}>{getStatusText()}</span>
      </div>
    );
  };

  // NEW: Workout Calendar with clickable dates
  const WorkoutCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    const workoutDates = sessions.map(s => ({
      date: new Date(s.date).getDate(),
      fullDate: s.date
    }));
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    const handleDateClick = (day) => {
      if (!day) return;
      
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const hasWorkout = workoutDates.some(wd => wd.date === day);
      if (hasWorkout) {
        setSelectedDate(selectedDate === dateStr ? null : dateStr);
      }
    };
    
    return (
      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a' }}>
        <h3 style={{ color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue', textAlign: 'center' }}>
          📅 {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        {selectedDate && (
          <div style={{textAlign: 'center', color: '#00bfff', marginBottom: '10px', fontSize: '0.9rem'}}>
            Showing: {new Date(selectedDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
            <button 
              onClick={() => setSelectedDate(null)}
              style={{marginLeft: '10px', background: '#ff3333', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}}
            >
              Clear
            </button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
            <div key={d} style={{ color: '#666', fontSize: '0.8rem', fontWeight: 'bold', padding: '5px' }}>{d}</div>
          ))}
          {days.map((day, idx) => {
            const hasWorkout = day && workoutDates.some(wd => wd.date === day);
            const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
            const isSelected = selectedDate === dateStr;
            
            return (
              <div 
                key={idx} 
                onClick={() => handleDateClick(day)}
                style={{
                  padding: '10px',
                  background: isSelected ? '#00bfff' : (hasWorkout ? '#39ff14' : (day ? '#0a0a0a' : 'transparent')),
                  color: isSelected ? '#fff' : (hasWorkout ? '#0a0a0a' : '#fff'),
                  borderRadius: '5px',
                  fontWeight: hasWorkout ? 'bold' : 'normal',
                  border: day === today.getDate() ? '2px solid #39ff14' : 'none',
                  cursor: hasWorkout ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (hasWorkout) e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseOut={(e) => {
                  if (hasWorkout) e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {day || ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // PIN lock check
  if (pinLocked && pinInput !== localStorage.getItem('gymPin')) {
    return (
      <div style={{minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px'}}>
        <div style={{fontSize: '3rem'}}>🔒</div>
        <h2 style={{color: '#39ff14', fontFamily: 'Bebas Neue', fontSize: '2rem'}}>ENTER PIN</h2>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => {
            setPinInput(e.target.value);
            if (e.target.value === localStorage.getItem('gymPin')) {
              setPinLocked(false);
            }
          }}
          placeholder="••••"
          style={{background: '#1a1a1a', border: '2px solid #39ff14', color: '#fff', padding: '15px', borderRadius: '8px', fontSize: '1.5rem', textAlign: 'center', width: '150px'}}
          maxLength={4}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '3rem', marginBottom: '20px'}}>💪</div>
          <p style={{color: '#39ff14', fontSize: '1.5rem', fontFamily: 'Bebas Neue'}}>LOADING YOUR GYM...</p>
        </div>
      </div>
    );
  }

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
    acc[ex.muscleGroup].push(ex);
    return acc;
  }, {});

  const getTrackingTypeBadge = (type) => {
    const badges = {
      weight_reps: { icon: '💪', label: 'Weight+Reps', color: '#39ff14' },
      reps_only: { icon: '🔢', label: 'Reps Only', color: '#00bfff' },
      duration: { icon: '⏱️', label: 'Duration', color: '#ffaa00' },
      distance: { icon: '📏', label: 'Distance', color: '#ff69b4' }
    };
    return badges[type] || badges.weight_reps;
  };

  const getExerciseName = (exerciseId) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    return exercise ? exercise.name : `Exercise ${exerciseId}`;
  };

  return (
    <div style={{minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Rajdhani, sans-serif', paddingBottom: '80px'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family:Rajdhani:wght@400;500;600;700&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      <SyncIndicator />

      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)', padding: '30px 20px', textAlign: 'center', borderBottom: '3px solid #39ff14', position: 'sticky', top: 0, zIndex: 100}}>
        <h1 style={{fontFamily: 'Bebas Neue', fontSize: '2.8rem', letterSpacing: '5px', color: '#39ff14', margin: 0, textShadow: '0 0 20px rgba(57, 255, 20, 0.5)'}}>
          ANKIT'S GYM LOG
        </h1>
        <div style={{fontSize: '0.9rem', color: '#888', marginTop: '8px', letterSpacing: '2px'}}>
          DATABASE • {exercises.length} EXERCISES • {sessions.length} WORKOUTS
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', background: '#1a1a1a', borderBottom: '2px solid #2a2a2a', position: 'sticky', top: '110px', zIndex: 99}}>
        {['log', 'history', 'reports', 'settings'].map(view => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            style={{
              padding: '18px 10px',
              background: currentView === view ? '#39ff14' : 'transparent',
              color: currentView === view ? '#0a0a0a' : '#fff',
              border: 'none',
              borderBottom: currentView === view ? '3px solid #39ff14' : '3px solid transparent',
              fontFamily: 'Bebas Neue',
              fontSize: '1.1rem',
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase'
            }}
          >
            {view === 'log' && '📝'}
            {view === 'history' && '📊'}
            {view === 'reports' && '📈'}
            {view === 'settings' && '⚙️'}
            <div style={{fontSize: '0.85rem', marginTop: '2px'}}>{view}</div>
          </button>
        ))}
      </div>

      <div style={{padding: '20px', maxWidth: '600px', margin: '0 auto'}}>
        
        {/* LOG VIEW */}
        {currentView === 'log' && (
          <div>
            <button
              onClick={() => setShowExercisePicker(true)}
              style={{
                width: '100%',
                padding: '25px',
                background: 'linear-gradient(135deg, #39ff14 0%, #2dd60f 100%)',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Bebas Neue',
                fontSize: '1.8rem',
                letterSpacing: '3px',
                cursor: 'pointer',
                marginBottom: '25px',
                boxShadow: '0 5px 20px rgba(57, 255, 20, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              + ADD EXERCISE
            </button>

            {currentSession.exercises.map((exercise, exIndex) => {
              const badge = getTrackingTypeBadge(exercise.trackingType);
              const lastSession = getLastSessionForExercise(exercise.exerciseId);
              
              return (
                <div key={exIndex} style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #151515 100%)',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '1px solid #2a2a2a',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px'}}>
                    <div style={{flex: 1}}>
                      <h3 style={{color: '#39ff14', margin: '0 0 8px 0', fontSize: '1.3rem', fontFamily: 'Bebas Neue', letterSpacing: '1px'}}>
                        {exercise.exerciseName}
                      </h3>
                      
                      {/* NEW: Last Session Stats */}
                      {lastSession && (
                        <div style={{
                          background: '#0a0a0a',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginBottom: '8px',
                          border: '1px solid #2a2a2a'
                        }}>
                          <div style={{color: '#888', fontSize: '0.75rem', marginBottom: '3px'}}>
                            Last: {new Date(lastSession.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                          </div>
                          <div style={{color: '#00bfff', fontSize: '0.85rem', fontWeight: 'bold'}}>
                            {exercise.trackingType === 'weight_reps' && `${lastSession.weight}kg × ${lastSession.reps}`}
                            {exercise.trackingType === 'reps_only' && `${lastSession.reps} reps`}
                            {exercise.trackingType === 'duration' && formatDuration(lastSession.duration)}
                            {exercise.trackingType === 'distance' && formatDistance(lastSession.distance)}
                          </div>
                        </div>
                      )}
                      
                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <span style={{
                          background: badge.color + '22',
                          color: badge.color,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          border: `1px solid ${badge.color}`
                        }}>
                          {badge.icon} {badge.label}
                        </span>
                        <span style={{color: '#666', fontSize: '0.85rem'}}>{exercise.muscleGroup}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeExerciseFromSession(exIndex)}
                      style={{background: '#ff3333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem'}}
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Dynamic input headers */}
                  <div style={{display: 'grid', gridTemplateColumns: exercise.trackingType === 'weight_reps' ? '50px 1fr 1fr' : exercise.trackingType === 'reps_only' ? '50px 1fr' : exercise.trackingType === 'duration' ? '50px 1fr 100px' : '50px 1fr', gap: '8px', marginBottom: '8px'}}>
                    <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>SET</div>
                    {exercise.trackingType === 'weight_reps' && (
                      <>
                        <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>KG</div>
                        <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>REPS</div>
                      </>
                    )}
                    {exercise.trackingType === 'reps_only' && (
                      <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>REPS</div>
                    )}
                    {exercise.trackingType === 'duration' && (
                      <>
                        <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>DURATION (SEC)</div>
                        <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>TIMER</div>
                      </>
                    )}
                    {exercise.trackingType === 'distance' && (
                      <div style={{fontWeight: 'bold', color: '#39ff14', fontSize: '0.9rem'}}>DISTANCE (M)</div>
                    )}
                  </div>

                  {/* Dynamic input rows */}
                  {exercise.sets.map((set, setIndex) => {
                    const timerKey = `${exIndex}-${setIndex}`;
                    const timerRunning = durationTimers[timerKey]?.running;
                    const timerDisplay = getDurationTimerDisplay(exIndex, setIndex);

                    return (
                      <div key={setIndex} style={{display: 'grid', gridTemplateColumns: exercise.trackingType === 'weight_reps' ? '50px 1fr 1fr' : exercise.trackingType === 'reps_only' ? '50px 1fr' : exercise.trackingType === 'duration' ? '50px 1fr 100px' : '50px 1fr', gap: '8px', marginBottom: '8px'}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', borderRadius: '6px', fontWeight: 'bold', color: '#39ff14'}}>
                          {setIndex + 1}
                        </div>

                        {exercise.trackingType === 'weight_reps' && (
                          <>
                            <input
                              type="number"
                              value={set.weight}
                              onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                              placeholder="0"
                              style={{background: '#0a0a0a', border: '2px solid #2a2a2a', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1rem', textAlign: 'center'}}
                            />
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                              placeholder="0"
                              style={{background: '#0a0a0a', border: '2px solid #2a2a2a', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1rem', textAlign: 'center'}}
                            />
                          </>
                        )}

                        {exercise.trackingType === 'reps_only' && (
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                            placeholder="0"
                            style={{background: '#0a0a0a', border: '2px solid #2a2a2a', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1rem', textAlign: 'center'}}
                          />
                        )}

                        {exercise.trackingType === 'duration' && (
                          <>
                            <input
                              type="number"
                              value={set.duration}
                              onChange={(e) => updateSet(exIndex, setIndex, 'duration', e.target.value)}
                              placeholder="Target (sec)"
                              style={{background: '#0a0a0a', border: '2px solid #2a2a2a', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1rem', textAlign: 'center'}}
                              disabled={timerRunning}
                            />
                            <button
                              onClick={() => timerRunning ? stopDurationTimer(exIndex, setIndex) : startDurationTimer(exIndex, setIndex)}
                              style={{
                                background: timerRunning ? '#ff3333' : '#39ff14',
                                color: timerRunning ? '#fff' : '#0a0a0a',
                                border: 'none',
                                padding: '12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              {timerRunning ? (
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
                                  <div style={{fontSize: '0.7rem'}}>⏱️</div>
                                  <div style={{fontSize: '0.75rem'}}>{timerDisplay?.text}</div>
                                  {timerDisplay && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      height: '3px',
                                      background: '#fff',
                                      width: `${(timerDisplay.remaining / timerDisplay.total) * 100}%`,
                                      transition: 'width 1s linear'
                                    }}></div>
                                  )}
                                </div>
                              ) : '▶ START'}
                            </button>
                          </>
                        )}

                        {exercise.trackingType === 'distance' && (
                          <input
                            type="number"
                            value={set.distance}
                            onChange={(e) => updateSet(exIndex, setIndex, 'distance', e.target.value)}
                            placeholder="0"
                            style={{background: '#0a0a0a', border: '2px solid #2a2a2a', color: '#fff', padding: '12px', borderRadius: '8px', fontSize: '1rem', textAlign: 'center'}}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Rest Timer */}
            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue', fontSize: '1.2rem'}}>⏱️ REST TIMER</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px'}}>
                {[30, 60, 90, 120].map(seconds => (
                  <button
                    key={seconds}
                    onClick={() => startRestTimer(seconds)}
                    style={{
                      padding: '15px',
                      background: restTimer === seconds && isTimerRunning ? '#39ff14' : '#2a2a2a',
                      color: restTimer === seconds && isTimerRunning ? '#0a0a0a' : '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
              {isTimerRunning && (
                <div style={{marginTop: '15px', textAlign: 'center'}}>
                  <div style={{fontSize: '2.5rem', color: '#39ff14', fontFamily: 'Bebas Neue'}}>
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <button
                    onClick={() => setIsTimerRunning(false)}
                    style={{background: '#ff3333', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px'}}
                  >
                    STOP
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={currentSession.notes}
              onChange={(e) => setCurrentSession(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Workout notes..."
              style={{width: '100%', background: '#1a1a1a', border: '2px solid #2a2a2a', color: '#fff', padding: '15px', borderRadius: '12px', resize: 'vertical', minHeight: '80px', marginBottom: '20px', fontFamily: 'inherit'}}
            />

            {currentSession.exercises.length > 0 && (
              <button
                onClick={saveSession}
                style={{
                  width: '100%',
                  padding: '25px',
                  background: 'linear-gradient(135deg, #39ff14 0%, #2dd60f 100%)',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.8rem',
                  letterSpacing: '3px',
                  cursor: 'pointer',
                  boxShadow: '0 5px 20px rgba(57, 255, 20, 0.3)'
                }}
              >
                💾 SAVE WORKOUT
              </button>
            )}
          </div>
        )}

        {/* HISTORY VIEW - CALENDAR MOVED HERE */}
        {currentView === 'history' && (
          <div>
            <h2 style={{fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#39ff14', marginBottom: '25px', letterSpacing: '2px'}}>
              📊 WORKOUT HISTORY
            </h2>
            
            {/* NEW: Calendar with clickable dates */}
            <WorkoutCalendar />
            
            {sessions.length === 0 ? (
              <div style={{textAlign: 'center', padding: '60px 20px', background: '#1a1a1a', borderRadius: '12px', border: '2px dashed #2a2a2a'}}>
                <div style={{fontSize: '4rem', marginBottom: '20px'}}>💪</div>
                <p style={{color: '#666', fontSize: '1.2rem'}}>No workouts logged yet.</p>
                <p style={{color: '#888', fontSize: '0.9rem', marginTop: '10px'}}>Start by adding your first workout!</p>
              </div>
            ) : (
              sessions
                .filter(session => !selectedDate || session.date === selectedDate)
                .map((session) => {
                  const uniqueExercises = {};
                  if (session.exercises) {
                    session.exercises.forEach(ex => {
                      if (!uniqueExercises[ex.exerciseId]) {
                        uniqueExercises[ex.exerciseId] = ex;
                      }
                    });
                  }

                  return (
                    <div key={session.id} style={{
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #151515 100%)',
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      border: '1px solid #2a2a2a',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                        <div>
                          <div style={{color: '#39ff14', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'Bebas Neue', letterSpacing: '1px'}}>
                            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                          {session.notes && (
                            <div style={{color: '#888', fontSize: '0.85rem', marginTop: '5px', fontStyle: 'italic'}}>
                              "{session.notes}"
                            </div>
                          )}
                        </div>
                        <div style={{display: 'flex', gap: '10px'}}>
                          <button
                            onClick={() => {
                              setEditingSession({...session, exercises: session.exercises || []});
                              setShowEditModal(true);
                            }}
                            style={{background: '#00bfff', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            style={{background: '#ff3333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer'}}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {Object.values(uniqueExercises).map((ex, idx) => {
                        if (!ex.sets || ex.sets.length === 0) return null;
                        
                        const badge = getTrackingTypeBadge(ex.trackingType);
                        
                        return (
                          <div key={idx} style={{
                            background: '#0a0a0a',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            border: '1px solid #1a1a1a'
                          }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                              <div style={{fontWeight: 'bold', color: '#fff', fontSize: '1rem'}}>
                                {ex.exerciseName}
                              </div>
                              <span style={{
                                background: badge.color + '22',
                                color: badge.color,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                border: `1px solid ${badge.color}`
                              }}>
                                {badge.icon}
                              </span>
                            </div>
                            <div style={{color: '#888', fontSize: '0.85rem'}}>
                              {ex.sets.map((set, i) => {
                                if (ex.trackingType === 'weight_reps' && set.reps && set.weight) {
                                  return <span key={i} style={{marginRight: '12px'}}>{set.weight}kg × {set.reps}</span>;
                                }
                                if (ex.trackingType === 'reps_only' && set.reps) {
                                  return <span key={i} style={{marginRight: '12px'}}>{set.reps} reps</span>;
                                }
                                if (ex.trackingType === 'duration' && set.duration) {
                                  return <span key={i} style={{marginRight: '12px'}}>{formatDuration(set.duration)}</span>;
                                }
                                if (ex.trackingType === 'distance' && set.distance) {
                                  return <span key={i} style={{marginRight: '12px'}}>{formatDistance(set.distance)}</span>;
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* REPORTS VIEW - CALENDAR REMOVED */}
        {currentView === 'reports' && (
          <div>
            <h2 style={{fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#39ff14', marginBottom: '25px', letterSpacing: '2px'}}>
              📈 PROGRESS REPORTS
            </h2>

            {/* Export Button */}
            <button
              onClick={exportToPDF}
              style={{
                width: '100%',
                padding: '20px',
                background: '#ff3333',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontFamily: 'Bebas Neue',
                fontSize: '1.4rem',
                cursor: 'pointer',
                marginBottom: '20px',
                letterSpacing: '2px'
              }}
            >
              📄 EXPORT WORKOUT LOG
            </button>

            {/* Personal Bests with ALL types */}
            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue'}}>🏆 PERSONAL BESTS</h3>
              {Object.keys(personalBests).length === 0 ? (
                <p style={{color: '#666'}}>No personal bests yet. Keep training!</p>
              ) : (
                Object.entries(personalBests).map(([exerciseId, best]) => {
                  const exerciseName = getExerciseName(parseInt(exerciseId));
                  
                  let dateText = '';
                  if (best.date) {
                    try {
                      const date = new Date(best.date);
                      if (!isNaN(date.getTime())) {
                        dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      }
                    } catch (e) {
                      dateText = '';
                    }
                  }
                  
                  let prText = '';
                  let oneRMText = '';
                  
                  if (best.trackingType === 'weight_reps') {
                    prText = `${best.weight}kg × ${best.reps} reps`;
                    oneRMText = `Est. 1RM: ${calculate1RM(best.weight, best.reps)}kg`;
                  } else if (best.trackingType === 'reps_only') {
                    prText = `${best.reps} reps`;
                  } else if (best.trackingType === 'duration') {
                    prText = formatDuration(best.duration);
                  } else if (best.trackingType === 'distance') {
                    prText = formatDistance(best.distance);
                  }
                  
                  return (
                    <div key={exerciseId} style={{
                      padding: '15px',
                      borderBottom: '1px solid #2a2a2a',
                      marginBottom: '10px'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                        <div>
                          <div style={{color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px'}}>
                            {exerciseName}
                          </div>
                          <div style={{color: '#39ff14', fontSize: '1rem', marginBottom: '5px'}}>
                            PR: {prText}
                          </div>
                          {oneRMText && (
                            <div style={{color: '#00bfff', fontSize: '0.9rem'}}>
                              {oneRMText}
                            </div>
                          )}
                        </div>
                        {dateText && (
                          <div style={{color: '#666', fontSize: '0.85rem'}}>
                            {dateText}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Workout Frequency */}
            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue'}}>📅 WORKOUT FREQUENCY</h3>
              <div style={{textAlign: 'center', padding: '20px'}}>
                <div style={{fontSize: '3rem', color: '#39ff14', fontFamily: 'Bebas Neue'}}>
                  {sessions.length}
                </div>
                <div style={{color: '#888', marginTop: '10px'}}>Total Workouts</div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS VIEW */}
        {currentView === 'settings' && (
          <div>
            <h2 style={{fontFamily: 'Bebas Neue', fontSize: '2rem', color: '#39ff14', marginBottom: '25px', letterSpacing: '2px'}}>
              ⚙️ SETTINGS
            </h2>

            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue'}}>💪 MANAGE EXERCISES</h3>
              <button
                onClick={() => setShowAddCustomExercise(true)}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#39ff14',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  marginBottom: '15px'
                }}
              >
                + ADD CUSTOM EXERCISE
              </button>
              <div style={{color: '#888', fontSize: '0.9rem'}}>
                Total Exercises: {exercises.length}
              </div>
            </div>

            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue'}}>🔒 PIN LOCK</h3>
              {localStorage.getItem('gymPin') ? (
                <button
                  onClick={() => {
                    if (window.confirm('Remove PIN lock?')) {
                      localStorage.removeItem('gymPin');
                      setPinLocked(false);
                      alert('PIN removed');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: '#ff3333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'Bebas Neue',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}
                >
                  REMOVE PIN
                </button>
              ) : (
                <button
                  onClick={() => {
                    const pin = prompt('Enter 4-digit PIN:');
                    if (pin && pin.length === 4 && !isNaN(pin)) {
                      localStorage.setItem('gymPin', pin);
                      alert('PIN set successfully!');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: '#39ff14',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'Bebas Neue',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}
                >
                  SET PIN
                </button>
              )}
            </div>

            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #2a2a2a'}}>
              <h3 style={{color: '#39ff14', marginBottom: '15px', fontFamily: 'Bebas Neue'}}>💾 DATA</h3>
              <button
                onClick={() => loadData()}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#39ff14',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                🔄 REFRESH DATA
              </button>
              <div style={{color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: '10px'}}>
                Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
              </div>
            </div>

            <div style={{background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #2a2a2a', textAlign: 'center'}}>
              <div style={{fontSize: '3rem', marginBottom: '10px'}}>💪</div>
              <div style={{fontFamily: 'Bebas Neue', fontSize: '1.5rem', color: '#39ff14', marginBottom: '10px'}}>
                ANKIT'S GYM LOG
              </div>
              <div style={{color: '#666', fontSize: '0.9rem'}}>
                Complete Version - All 13 Features
              </div>
              <div style={{color: '#444', fontSize: '0.8rem', marginTop: '10px'}}>
                ✅ Calendar ✅ Last Session ✅ All PRs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000,
          overflow: 'auto'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '3px solid #39ff14',
            boxShadow: '0 10px 40px rgba(57, 255, 20, 0.3)'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #2a2a2a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: '#1a1a1a',
              zIndex: 10
            }}>
              <h2 style={{fontFamily: 'Bebas Neue', color: '#39ff14', margin: 0, fontSize: '1.8rem', letterSpacing: '2px'}}>
                SELECT EXERCISE
              </h2>
              <button
                onClick={() => setShowExercisePicker(false)}
                style={{background: 'none', border: 'none', color: '#ff3333', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 1}}
              >
                ×
              </button>
            </div>

            <div style={{padding: '20px'}}>
              <button
                onClick={() => {
                  setShowExercisePicker(false);
                  setShowAddCustomExercise(true);
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: '#00bfff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  letterSpacing: '1px'
                }}
              >
                + CREATE NEW EXERCISE
              </button>

              <input
                type="text"
                placeholder="🔍 Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '1rem'
                }}
              />

              {Object.entries(groupedExercises).map(([muscleGroup, exs]) => (
                <div key={muscleGroup} style={{marginBottom: '25px'}}>
                  <h3 style={{
                    color: '#39ff14',
                    fontFamily: 'Bebas Neue',
                    fontSize: '1.3rem',
                    marginBottom: '12px',
                    letterSpacing: '1px'
                  }}>
                    {muscleGroup}
                  </h3>
                  {exs.map((exercise) => {
                    const badge = getTrackingTypeBadge(exercise.trackingType);
                    return (
                      <div
                        key={exercise.id}
                        onClick={() => addExerciseToSession(exercise)}
                        style={{
                          padding: '15px',
                          background: '#0a0a0a',
                          borderRadius: '10px',
                          marginBottom: '10px',
                          cursor: 'pointer',
                          border: '2px solid #2a2a2a',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = '#39ff14';
                          e.currentTarget.style.transform = 'translateX(5px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#2a2a2a';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div>
                            <div style={{fontWeight: 'bold', color: '#fff', fontSize: '1rem', marginBottom: '5px'}}>
                              {exercise.name}
                            </div>
                            <div style={{fontSize: '0.85rem', color: '#666'}}>
                              {exercise.equipmentType}
                            </div>
                          </div>
                          <span style={{
                            background: badge.color + '22',
                            color: badge.color,
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            border: `1px solid ${badge.color}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showAddCustomExercise && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            border: '3px solid #39ff14'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #2a2a2a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{fontFamily: 'Bebas Neue', color: '#39ff14', margin: 0, fontSize: '1.8rem'}}>
                ADD CUSTOM EXERCISE
              </h2>
              <button
                onClick={() => setShowAddCustomExercise(false)}
                style={{background: 'none', border: 'none', color: '#ff3333', fontSize: '2.5rem', cursor: 'pointer'}}
              >
                ×
              </button>
            </div>

            <div style={{padding: '25px'}}>
              <input
                type="text"
                placeholder="Exercise name"
                value={customExerciseForm.name}
                onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '15px',
                  fontSize: '1rem'
                }}
              />

              <select
                value={customExerciseForm.muscleGroup}
                onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '15px',
                  fontSize: '1rem'
                }}
              >
                {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Whole Body', 'Compound', 'Mobility'].map(mg => (
                  <option key={mg} value={mg}>{mg}</option>
                ))}
              </select>

              <select
                value={customExerciseForm.equipmentType}
                onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, equipmentType: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '15px',
                  fontSize: '1rem'
                }}
              >
                {['Free Weight', 'Machine', 'Cable', 'Bodyweight', 'Equipment'].map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>

              <select
                value={customExerciseForm.trackingType}
                onChange={(e) => setCustomExerciseForm(prev => ({ ...prev, trackingType: e.target.value }))}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  fontSize: '1rem'
                }}
              >
                <option value="weight_reps">💪 Weight + Reps</option>
                <option value="reps_only">🔢 Reps Only</option>
                <option value="duration">⏱️ Duration</option>
                <option value="distance">📏 Distance</option>
              </select>

              <button
                onClick={addCustomExercise}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: '#39ff14',
                  color: '#0a0a0a',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  letterSpacing: '2px'
                }}
              >
                ADD EXERCISE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditModal && editingSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000,
          overflow: 'auto'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '3px solid #00bfff'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #2a2a2a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: '#1a1a1a',
              zIndex: 10
            }}>
              <h2 style={{fontFamily: 'Bebas Neue', color: '#00bfff', margin: 0, fontSize: '1.8rem'}}>
                EDIT WORKOUT
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSession(null);
                }}
                style={{background: 'none', border: 'none', color: '#ff3333', fontSize: '2.5rem', cursor: 'pointer'}}
              >
                ×
              </button>
            </div>

            <div style={{padding: '20px'}}>
              {editingSession.exercises && editingSession.exercises.map((exercise, exIndex) => {
                const badge = getTrackingTypeBadge(exercise.trackingType);
                return (
                  <div key={exIndex} style={{
                    background: '#0a0a0a',
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '15px',
                    border: '1px solid #2a2a2a'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                      <div>
                        <div style={{color: '#00bfff', fontWeight: 'bold', marginBottom: '5px'}}>
                          {exercise.exerciseName}
                        </div>
                        <span style={{
                          background: badge.color + '22',
                          color: badge.color,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          border: `1px solid ${badge.color}`
                        }}>
                          {badge.icon}
                        </span>
                      </div>
                    </div>

                    {exercise.sets && exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} style={{display: 'flex', gap: '10px', marginBottom: '8px'}}>
                        <div style={{width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', borderRadius: '5px', color: '#00bfff'}}>
                          {setIndex + 1}
                        </div>
                        {exercise.trackingType === 'weight_reps' && (
                          <>
                            <input
                              type="number"
                              value={set.weight || ''}
                              onChange={(e) => updateEditSet(exIndex, setIndex, 'weight', e.target.value)}
                              placeholder="kg"
                              style={{flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '5px', textAlign: 'center'}}
                            />
                            <input
                              type="number"
                              value={set.reps || ''}
                              onChange={(e) => updateEditSet(exIndex, setIndex, 'reps', e.target.value)}
                              placeholder="reps"
                              style={{flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '5px', textAlign: 'center'}}
                            />
                          </>
                        )}
                        {exercise.trackingType === 'reps_only' && (
                          <input
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => updateEditSet(exIndex, setIndex, 'reps', e.target.value)}
                            placeholder="reps"
                            style={{flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '5px', textAlign: 'center'}}
                          />
                        )}
                        {exercise.trackingType === 'duration' && (
                          <input
                            type="number"
                            value={set.duration || ''}
                            onChange={(e) => updateEditSet(exIndex, setIndex, 'duration', e.target.value)}
                            placeholder="seconds"
                            style={{flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '5px', textAlign: 'center'}}
                          />
                        )}
                        {exercise.trackingType === 'distance' && (
                          <input
                            type="number"
                            value={set.distance || ''}
                            onChange={(e) => updateEditSet(exIndex, setIndex, 'distance', e.target.value)}
                            placeholder="meters"
                            style={{flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px', borderRadius: '5px', textAlign: 'center'}}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              <textarea
                value={editingSession.notes || ''}
                onChange={(e) => setEditingSession(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Workout notes..."
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  border: '2px solid #2a2a2a',
                  color: '#fff',
                  padding: '15px',
                  borderRadius: '10px',
                  resize: 'vertical',
                  minHeight: '80px',
                  marginBottom: '20px',
                  fontFamily: 'inherit'
                }}
              />

              <button
                onClick={updateSession}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: '#00bfff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: 'Bebas Neue',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  letterSpacing: '2px'
                }}
              >
                💾 SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GymTracker;
