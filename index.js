const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'Workout API',
        version: '1.0.0',
        description: 'This is a simple CRUD API application made with Express and documented with Swagger',
      },
      servers: [
        {
          url: 'http://localhost:5000',
        },
      ],
    },
    // ['.routes/*.js']
    apis: ['index.js'], // files containing annotations as above
  };
  
  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  
// serve all static routes
app.use(express.static(path.join(__dirname)));

// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Enable express to parse json and url-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//add user
app.post('/addUser', async (req, res) => {
  const requiredFields = ['userid', 'email', 'password']; // replace with your actual required fields
  const userData = req.body;
  
  // check if all required fields are present
  let missingFields = requiredFields.filter(field => !(field in userData));
  
  if (missingFields.length > 0) {
      return res.status(400).json({ error: `Fields missing: ${missingFields.join(', ')}` });
  }

  // If all required fields are present, proceed with the insert operation
  const { data, error } = await supabase
      .from('users')
      .insert([
          { ...userData }
      ]);
  
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});



app.get('/getUser/:userid', async (req, res) => {
    const userid = req.params.userid;
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('userid', userid);
    if (error) {
        // Check if the error message indicates that the user doesn't exist
        if (error.message.includes('relation "users" does not exist')) {
            return res.status(404).json({ error: `${userid} not registered. Ask user if they would like to register (then you can use addUser to register them)` });
        } else {
            return res.status(400).json({ error: error.message });
        }
    }
    
    return res.status(200).json({ data });
});

// This route updates an existing user in the database
app.put('/updateUser/:userid', async (req, res) => {
  const userid = req.params.userid;
  const updatedFields = req.body;
  const { data, error } = await supabase
    .from('users')
    .update(updatedFields)
    .match({ userid });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route deletes a user from the database
app.delete('/deleteUser/:userid', async (req, res) => {
  const userid = req.params.userid;
  const { data, error } = await supabase
    .from('users')
    .delete()
    .match({ userid });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route adds a new schedule to the database for a specific user
app.post('/addSchedule/:userid', async (req, res) => {
    const userid = req.params.userid;
    const scheduleData = req.body;
    const { data, error } = await supabase
      .from('schedules')
      .insert([
        { userid, ...scheduleData }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates an existing schedule in the database for a specific user
  app.put('/updateSchedule/:userid/:scheduleid', async (req, res) => {
    const userid = req.params.userid;
    const scheduleid = req.params.scheduleid;
    const updatedFields = req.body;
    const { data, error } = await supabase
      .from('schedules')
      .update(updatedFields)
      .eq('userid', userid)
      .eq('scheduleid', scheduleid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route deletes a schedule from the database for a specific user
  app.delete('/deleteSchedule/:userid/:scheduleid', async (req, res) => {
    const userid = req.params.userid;
    const scheduleid = req.params.scheduleid;
    const { data, error } = await supabase
      .from('schedules')
      .delete()
      .eq('userid', userid)
      .eq('scheduleid', scheduleid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves a schedule entry from the database based on its id for a specific user
  app.get('/getSchedule/:userid/:scheduleid', async (req, res) => {
    const userid = req.params.userid;
    const scheduleid = req.params.scheduleid;
    const { data, error } = await supabase
      .from('schedules')
      .select()
      .eq('userid', userid)
      .eq('scheduleid', scheduleid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves schedule entries based on specified query parameters for a specific user
  app.get('/getSchedules/:userid', async (req, res) => {
    const userid = req.params.userid;
    const queryParams = req.query;
    const { data, error } = await supabase
      .from('schedules')
      .select()
      .eq('userid', userid)
      .match(queryParams);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
// This route retrieves the details of a specific workout plan
app.get('/getWorkoutPlan/:workoutid', async (req, res) => {
    const workoutid = req.params.workoutid;
    const { data, error } = await supabase
      .from('workoutplans')
      .select()
      .eq('workoutid', workoutid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates the name of a specific workout plan
  app.put('/updateWorkoutPlan/:workoutid', async (req, res) => {
    const workoutid = req.params.workoutid;
    const { workoutName } = req.body;
    const { data, error } = await supabase
      .from('workoutplans')
      .update({ workoutName })
      .eq('workoutid', workoutid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route deletes a specific workout plan
  app.delete('/deleteWorkoutPlan/:workoutid', async (req, res) => {
    const workoutid = req.params.workoutid;
    const { data, error } = await supabase
      .from('workoutplans')
      .delete()
      .eq('workoutid', workoutid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves all workout plans for a specific user
  app.get('/getUserWorkoutPlans/:userid', async (req, res) => {
    const userid = req.params.userid;
    const { data, error } = await supabase
      .from('workoutplans')
      .select()
      .eq('userid', userid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route adds a new exercise to the Exercise table
  app.post('/addExercise', async (req, res) => {
    const { exerciseName, reps, sets } = req.body;
    const { data, error } = await supabase
      .from('exercises')
      .insert([{ exerciseName, reps, sets }]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route retrieves the details of a specific exercise
  app.get('/getExercise/:exerciseid', async (req, res) => {
    const exerciseid = req.params.exerciseid;
    const { data, error } = await supabase
      .from('exercises')
      .select()
      .eq('exerciseid', exerciseid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route updates the details of a specific exercise
  app.put('/updateExercise/:exerciseid', async (req, res) => {
    const exerciseid = req.params.exerciseid;
    const { exerciseName, reps, sets } = req.body;
    const { data, error } = await supabase
    .from('exercises')
    .update({ exerciseName, reps, sets })
    .eq('exerciseid', exerciseid);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
    });

    // This route deletes a specific exercise
    app.delete('/deleteExercise/:exerciseid', async (req, res) => {
        const exerciseid = req.params.exerciseid;
        const { data, error } = await supabase
        .from('exercises')
        .delete()
        .eq('exerciseid', exerciseid);

        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data });
    });

    // This route retrieves all exercises
    app.get('/getExercises', async (req, res) => {
        const { data, error } = await supabase
        .from('exercises')
        .select();

        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data });
    });


// This route adds an exercise to a workout plan
app.post('/addExerciseToWorkoutPlan/:workoutid/:exerciseid', async (req, res) => {
    const { workoutid, exerciseid } = req.params;
    const { data, error } = await supabase
      .from('workoutplanexercises')
      .insert([
        { workoutid, exerciseid }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route removes an exercise from a workout plan
  app.delete('/removeExerciseFromWorkoutPlan/:workoutid/:exerciseid', async (req, res) => {
    const { workoutid, exerciseid } = req.params;
    const { data, error } = await supabase
      .from('workoutplanexercises')
      .delete()
      .eq('workoutid', workoutid)
      .eq('exerciseid', exerciseid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route adds a workout plan to a schedule
  app.post('/addWorkoutPlanToSchedule/:scheduleid/:workoutid', async (req, res) => {
    const { scheduleid, workoutid } = req.params;
    const { data, error } = await supabase
      .from('workoutschedules')
      .insert([
        { scheduleid, workoutid }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route removes a workout plan from a schedule
  app.delete('/removeWorkoutPlanFromSchedule/:scheduleid/:workoutid', async (req, res) => {
    const { scheduleid, workoutid } = req.params;
    const { data, error } = await supabase
      .from('workoutschedules')
      .delete()
      .eq('scheduleid', scheduleid)
      .eq('workoutid', workoutid);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route marks a workout plan as completed for a user
  app.post('/completeWorkout/:userid/:workoutid', async (req, res) => {
    const { userid, workoutid } = req.params;
    const { completionDate, completionTime } = req.body; // assume client passes these values in the request body
    const { data, error } = await supabase
      .from('workoutcompletions')
      .insert([
        { userid, workoutid, completionDate, completionTime, workoutDone: true }
      ]);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
  // This route gets all completed workouts for a user
  app.get('/getCompletedWorkouts/:userid', async (req, res) => {
    const { userid } = req.params;
    const { data, error } = await supabase
      .from('workoutcompletions')
      .select()
      .eq('userid', userid)
      .eq('workoutdone', true);
  
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
  });
  
/**
 * @openapi
 * /updateUser/{userid}:
 *   put:
 *     description: This route updates an existing user in the database
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *             example:
 *               name: John Doe
 *               email: john@doe.com
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /deleteUser/{userid}:
 *   delete:
 *     description: This route deletes a user from the database
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /addSchedule/{userid}:
 *   post:
 *     description: This route adds a new schedule to the database for a specific user
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user to add the schedule to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduleData:
 *                 type: object
 *             example:
 *               scheduleData:
 *                 day: Monday
 *                 time: 09:00 AM
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /updateSchedule/{userid}/{scheduleid}:
 *   put:
 *     description: This route updates an existing schedule in the database for a specific user
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who owns the schedule
 *         schema:
 *           type: string
 *       - in: path
 *         name: scheduleid
 *         required: true
 *         description: The id of the schedule to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updatedFields:
 *                 type: object
 *             example:
 *               updatedFields:
 *                 day: Tuesday
 *                 time: 10:00 AM
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /deleteSchedule/{userid}/{scheduleid}:
 *   delete:
 *     description: This route deletes a schedule from the database for a specific user
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who owns the schedule
 *         schema:
 *           type: string
 *       - in: path
 *         name: scheduleid
 *         required: true
 *         description: The id of the schedule to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getSchedule/{userid}/{scheduleid}:
 *   get:
 *     description: This route retrieves a schedule entry from the database based on its id for a specific user
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who owns the schedule
 *         schema:
 *           type: string
 *       - in: path
 *         name: scheduleid
 *         required: true
 *         description: The id of the schedule to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getSchedules/{userid}:
 *   get:
 *     description: This route retrieves schedule entries based on specified query parameters for a specific user
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who owns the schedules
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getWorkoutPlan/{workoutid}:
 *   get:
 *     description: This route retrieves the details of a specific workout plan
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /updateWorkoutPlan/{workoutid}:
 *   put:
 *     description: This route updates the name of a specific workout plan
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workoutName:
 *                 type: string
 *             example:
 *               workoutName: New Workout Plan
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /deleteWorkoutPlan/{workoutid}:
 *   delete:
 *     description: This route deletes a specific workout plan
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getUserWorkoutPlans/{userid}:
 *   get:
 *     description: This route retrieves all workout plans for a specific user
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who owns the workout plans
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /addExercise:
 *   post:
 *     description: This route adds a new exercise to the Exercise table
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exerciseName:
 *                 type: string
 *               reps:
 *                 type: number
 *               sets:
 *                 type: number
 *             example:
 *               exerciseName: Squats
 *               reps: 10
 *               sets: 3
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getExercise/{exerciseid}:
 *   get:
 *     description: This route retrieves the details of a specific exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: exerciseid
 *         required: true
 *         description: The id of the exercise to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /updateExercise/{exerciseid}:
 *   put:
 *     description: This route updates the details of a specific exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: exerciseid
 *         required: true
 *         description: The id of the exercise to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exerciseName:
 *                 type: string
 *               reps:
 *                 type: number
 *               sets:
 *                 type: number
 *             example:
 *               exerciseName: Squats
 *               reps: 12
 *               sets: 4
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /deleteExercise/{exerciseid}:
 *   delete:
 *     description: This route deletes a specific exercise
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: exerciseid
 *         required: true
 *         description: The id of the exercise to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getExercises:
 *   get:
 *     description: This route retrieves all exercises
 *     tags: [Exercises]
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /addExerciseToWorkoutPlan/{workoutid}/{exerciseid}:
 *   post:
 *     description: This route adds an exercise to a workout plan
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to add the exercise to
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseid
 *         required: true
 *         description: The id of the exercise to add to the workout plan
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /removeExerciseFromWorkoutPlan/{workoutid}/{exerciseid}:
 *   delete:
 *     description: This route removes an exercise from a workout plan
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to remove the exercise from
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseid
 *         required: true
 *         description: The id of the exercise to remove from the workout plan
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /addWorkoutPlanToSchedule/{scheduleid}/{workoutid}:
 *   post:
 *     description: This route adds a workout plan to a schedule
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: scheduleid
 *         required: true
 *         description: The id of the schedule to add the workout plan to
 *         schema:
 *           type: string
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to add to the schedule
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /removeWorkoutPlanFromSchedule/{scheduleid}/{workoutid}:
 *   delete:
 *     description: This route removes a workout plan from a schedule
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: scheduleid
 *         required: true
 *         description: The id of the schedule to remove the workout plan from
 *         schema:
 *           type: string
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to remove from the schedule
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /completeWorkout/{userid}/{workoutid}:
 *   post:
 *     description: This route marks a workout plan as completed for a user
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who completed the workout plan
 *         schema:
 *           type: string
 *       - in: path
 *         name: workoutid
 *         required: true
 *         description: The id of the workout plan to mark as completed
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completionDate:
 *                 type: string
 *                 format: date
 *               completionTime:
 *                 type: string
 *                 format: time
 *             example:
 *               completionDate: 2023-06-12
 *               completionTime: 09:30 AM
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /getCompletedWorkouts/{userid}:
 *   get:
 *     description: This route gets all completed workouts for a user
 *     tags: [Workout Plans]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user who completed the workouts
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

/**
 * @openapi
 * /addUser:
 *   post:
 *     description: This route adds a new user to the database
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *             example:
 *               name: John Doe
 *               email: john@doe.com
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */
/**
 * @openapi
 * /getUser/{userid}:
 *   get:
 *     description: This route retrieves a user from the database based on their id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The id of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation
 *       '400':
 *         description: Error occurred
 */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});