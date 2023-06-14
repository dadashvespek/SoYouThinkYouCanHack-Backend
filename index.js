const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const path = require('path');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname)));
app.route('/schedule/:user_id/:weekOffset?')
    .get(async (req, res) => {
        const user_id = req.params.user_id;
        const weekOffset = Number(req.params.weekOffset) || 0; // Defaults to 0 if not provided

        let { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_id', user_id)

        if (error) {
            res.status(500).json({ error: 'Failed to fetch data from Supabase' });
            return;
        }

        if (!data) {
            res.json({});
            return;
        }

        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + (weekOffset * 7)); // Apply week offset
        const currentDayOfWeek = currentDate.getDay();
        // Calculate start (Monday) and end (Sunday) of the week
        const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)));
        const endOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDayOfWeek + 7));

        const weekData = data.filter(entry => {
            const startDateTime = new Date(entry.start_datetime);
            if (entry.repeating === 'Everyday' || entry.repeating === 'Everyweek') {
                return true;
            } else {
                return startDateTime >= startOfWeek && startDateTime <= endOfWeek;
            }
        });
        const transformedData = {
            user_id: user_id,
            weekOffset: weekOffset,
            schedule: weekData.flatMap(entry => {
                const startDateTime = new Date(entry.start_datetime);
                const endDateTime = new Date(entry.end_datetime);
                const duration = (endDateTime - startDateTime) / (60 * 60 * 1000); // in hours

                let blocks = [];
                for(let i = 0; i < duration; ) {
                    const blockDuration = Math.min(4, duration - i);
                    blocks.push({
                        dayOfWeek: startDateTime.getDay(),
                        startHour: startDateTime.getHours() + i,
                        endHour: startDateTime.getHours() + i + blockDuration,
                        duration: blockDuration,
                        event_name: entry.event_name,
                        location: entry.location
                    });
                    i += blockDuration;
                }
                
                if (entry.repeating === 'Everyday') {
                    // Create an entry for each day of the week
                    return Array(7).fill().map((_, dayOfWeek) => {
                        return blocks.map(block => ({
                            ...block,
                            dayOfWeek: dayOfWeek,
                        }));
                    }).flat();
                } else if (entry.repeating === 'Everyweek' && startDateTime.getDay() >= startOfWeek.getDay() && startDateTime.getDay() <= endOfWeek.getDay()) {
                    // Create an entry for the same day of each week
                    return blocks;
                } else {
                    return blocks;
                }
            }).flat()
        };

        res.render('schedule', transformedData);
    })

    app.get('/data/:user_id', async (req, res) => {
        const user_id = req.params.user_id;
    
        // Fetch the data from Supabase
        let { data, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('user_id', user_id);
        
        if (error) {
            res.status(500).json({ error: 'Failed to fetch data from Supabase' });
            return;
        }
    
        if (!data) {
            res.json({});
            return;
        }
    
        // Parse the query parameters
        const { start_datetime, end_datetime, location } = req.query;
    
        // Filter the data based on the query parameters
        const filteredData = data.filter(entry => {
            const startDateTime = new Date(entry.start_datetime);
            const endDateTime = new Date(entry.end_datetime);
    
            // Check if entry falls within the datetime window
            if (start_datetime && end_datetime) {
                const windowStart = new Date(start_datetime);
                const windowEnd = new Date(end_datetime);
                if (!(startDateTime >= windowStart && endDateTime <= windowEnd)) {
                    return false;
                }
            } else if (start_datetime) {
                const windowStart = new Date(start_datetime);
                if (!(startDateTime >= windowStart)) {
                    return false;
                }
            } else if (end_datetime) {
                const windowEnd = new Date(end_datetime);
                if (!(endDateTime <= windowEnd)) {
                    return false;
                }
            }
    
            // Check if entry matches the given location
            if (location && entry.location !== location) {
                return false;
            }
    
            return true;
        });
    
        const consolidatedData = {};

        filteredData.forEach(entry => {
            const startDateTime = new Date(entry.start_datetime);
            const endDateTime = new Date(entry.end_datetime);
    
            const date = startDateTime.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
            const startTime = startDateTime.getHours();
            const endTime = endDateTime.getHours();
    
            if (!consolidatedData[date]) {
                consolidatedData[date] = [];
            }
    
            consolidatedData[date].push({
                startTime,
                endTime,
                eventName: entry.event_name,
                location: entry.location,
            });
        });
    
        // Convert consolidatedData into a more readable format
        const result = Object.entries(consolidatedData).map(([date, events]) => {
            const eventSummaries = events.map(event => {
                return `${event.startTime}-${event.endTime}: ${event.eventName} at ${event.location}`;
            });
            return `${date}: ${eventSummaries.join(', ')}`;
        });
    
        res.json(result);
    });
    
app.listen(3000, function () {
  console.log('App listening on port 3000!');
});