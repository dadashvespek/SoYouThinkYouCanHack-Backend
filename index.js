const express = require('express');
const app = express();

app.get('/schedule/:userId', async function(req, res) {
    const userId = req.params.userId;
    
    // Import the script file
    const { fetchSchedule } = require('./script');

    try {
        // Fetch the schedule from Supabase
        const scheduleHTML = await fetchSchedule(userId);
        
        // Send the schedule as a response
        res.send(scheduleHTML);
    } catch(error) {
        res.status(500).send("An error occurred");
    }
});

app.listen(3000, function () {
  console.log('App listening on port 3000!');
});