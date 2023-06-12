const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Enable express to parse json and url-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// This route adds a new user to the database
app.post('/addUser', async (req, res) => {
  const userData = req.body; 
  const { data, error } = await supabase
    .from('User')
    .insert([
      { ...userData }
    ]);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route updates an existing user in the database
app.put('/updateUser/:userID', async (req, res) => {
  const userID = req.params.userID;
  const updatedFields = req.body;
  const { data, error } = await supabase
    .from('User')
    .update(updatedFields)
    .match({ userID });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route deletes a user from the database
app.delete('/deleteUser/:userID', async (req, res) => {
  const userID = req.params.userID;
  const { data, error } = await supabase
    .from('User')
    .delete()
    .match({ userID });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route adds a new schedule to the database for a specific user
app.post('/addSchedule/:userID', async (req, res) => {
    const userID = req.params.userID;
    const scheduleData = req.body;
    const { data, error } = await supabase
      .from('Schedule')
      .insert([
        { userID, ...scheduleData }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates an existing schedule in the database for a specific user
  app.put('/updateSchedule/:userID/:scheduleID', async (req, res) => {
    const userID = req.params.userID;
    const scheduleID = req.params.scheduleID;
    const updatedFields = req.body;
    const { data, error } = await supabase
      .from('Schedule')
      .update(updatedFields)
      .eq('userID', userID)
      .eq('scheduleID', scheduleID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route deletes a schedule from the database for a specific user
  app.delete('/deleteSchedule/:userID/:scheduleID', async (req, res) => {
    const userID = req.params.userID;
    const scheduleID = req.params.scheduleID;
    const { data, error } = await supabase
      .from('Schedule')
      .delete()
      .eq('userID', userID)
      .eq('scheduleID', scheduleID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves a schedule entry from the database based on its ID for a specific user
  app.get('/getSchedule/:userID/:scheduleID', async (req, res) => {
    const userID = req.params.userID;
    const scheduleID = req.params.scheduleID;
    const { data, error } = await supabase
      .from('Schedule')
      .select()
      .eq('userID', userID)
      .eq('scheduleID', scheduleID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves schedule entries based on specified query parameters for a specific user
  app.get('/getSchedules/:userID', async (req, res) => {
    const userID = req.params.userID;
    const queryParams = req.query;
    const { data, error } = await supabase
      .from('Schedule')
      .select()
      .eq('userID', userID)
      .match(queryParams);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
// This route retrieves the details of a specific workout plan
app.get('/getWorkoutPlan/:workoutID', async (req, res) => {
    const workoutID = req.params.workoutID;
    const { data, error } = await supabase
      .from('WorkoutPlan')
      .select()
      .eq('workoutID', workoutID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates the name of a specific workout plan
  app.put('/updateWorkoutPlan/:workoutID', async (req, res) => {
    const workoutID = req.params.workoutID;
    const { workoutName } = req.body;
    const { data, error } = await supabase
      .from('WorkoutPlan')
      .update({ workoutName })
      .eq('workoutID', workoutID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route deletes a specific workout plan
  app.delete('/deleteWorkoutPlan/:workoutID', async (req, res) => {
    const workoutID = req.params.workoutID;
    const { data, error } = await supabase
      .from('WorkoutPlan')
      .delete()
      .eq('workoutID', workoutID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves all workout plans for a specific user
  app.get('/getUserWorkoutPlans/:userID', async (req, res) => {
    const userID = req.params.userID;
    const { data, error } = await supabase
      .from('WorkoutPlan')
      .select()
      .eq('userID', userID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route adds a new exercise to the Exercise table
  app.post('/addExercise', async (req, res) => {
    const { exerciseName, reps, sets } = req.body;
    const { data, error } = await supabase
      .from('Exercise')
      .insert([{ exerciseName, reps, sets }]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves the details of a specific exercise
  app.get('/getExercise/:exerciseID', async (req, res) => {
    const exerciseID = req.params.exerciseID;
    const { data, error } = await supabase
      .from('Exercise')
      .select()
      .eq('exerciseID', exerciseID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates the details of a specific exercise
  app.put('/updateExercise/:exerciseID', async (req, res) => {
    const exerciseID = req.params.exerciseID;
    const { exerciseName, reps, sets } = req.body;
    const { data, error } = await supabase
    .from('Exercise')
    .update({ exerciseName, reps, sets })
    .eq('exerciseID', exerciseID);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
    });

    // This route deletes a specific exercise
    app.delete('/deleteExercise/:exerciseID', async (req, res) => {
        const exerciseID = req.params.exerciseID;
        const { data, error } = await supabase
        .from('Exercise')
        .delete()
        .eq('exerciseID', exerciseID);

        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data });
    });

    // This route retrieves all exercises
    app.get('/getExercises', async (req, res) => {
        const { data, error } = await supabase
        .from('Exercise')
        .select();

        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data });
    });


// This route adds an exercise to a workout plan
app.post('/addExerciseToWorkoutPlan/:workoutID/:exerciseID', async (req, res) => {
    const { workoutID, exerciseID } = req.params;
    const { data, error } = await supabase
      .from('WorkoutPlanExercises')
      .insert([
        { workoutID, exerciseID }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route removes an exercise from a workout plan
  app.delete('/removeExerciseFromWorkoutPlan/:workoutID/:exerciseID', async (req, res) => {
    const { workoutID, exerciseID } = req.params;
    const { data, error } = await supabase
      .from('WorkoutPlanExercises')
      .delete()
      .eq('workoutID', workoutID)
      .eq('exerciseID', exerciseID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route adds a workout plan to a schedule
  app.post('/addWorkoutPlanToSchedule/:scheduleID/:workoutID', async (req, res) => {
    const { scheduleID, workoutID } = req.params;
    const { data, error } = await supabase
      .from('WorkoutSchedule')
      .insert([
        { scheduleID, workoutID }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route removes a workout plan from a schedule
  app.delete('/removeWorkoutPlanFromSchedule/:scheduleID/:workoutID', async (req, res) => {
    const { scheduleID, workoutID } = req.params;
    const { data, error } = await supabase
      .from('WorkoutSchedule')
      .delete()
      .eq('scheduleID', scheduleID)
      .eq('workoutID', workoutID);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route marks a workout plan as completed for a user
  app.post('/completeWorkout/:userID/:workoutID', async (req, res) => {
    const { userID, workoutID } = req.params;
    const { completionDate, completionTime } = req.body; // assume client passes these values in the request body
    const { data, error } = await supabase
      .from('WorkoutCompletion')
      .insert([
        { userID, workoutID, completionDate, completionTime, workoutDone: true }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route gets all completed workouts for a user
  app.get('/getCompletedWorkouts/:userID', async (req, res) => {
    const { userID } = req.params;
    const { data, error } = await supabase
      .from('WorkoutCompletion')
      .select()
      .eq('userID', userID)
      .eq('workoutDone', true);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});