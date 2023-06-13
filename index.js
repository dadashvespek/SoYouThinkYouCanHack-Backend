const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
app.set('view engine', 'ejs');
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
        console.log(`Current date: ${currentDate}`);
        currentDate.setDate(currentDate.getDate() + (weekOffset * 7)); // Apply week offset
        console.log(`Current date (after offset): ${currentDate}`);
        const currentDayOfWeek = currentDate.getDay();
        console.log(`Current day of week: ${currentDayOfWeek}`);
        // Calculate start (Monday) and end (Sunday) of the week
        const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)));
        console.log(`Start of week: ${startOfWeek}`);
        const endOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDayOfWeek + 7));
        console.log(`End of week: ${endOfWeek}`);

        const weekData = data.filter(entry => {
            const startDateTime = new Date(entry.start_datetime);
            if (entry.repeating === 'Everyday' || entry.repeating === 'Everyweek') {
                return true;
            } else {
                return startDateTime >= startOfWeek && startDateTime <= endOfWeek;
            }
        });

        console.log(`Week data: ${JSON.stringify(weekData)}`);
        const transformedData = {
            user_id: user_id,
            weekOffset: weekOffset,
            schedule: weekData.flatMap(entry => {
                const startDateTime = new Date(entry.start_datetime);
                const endDateTime = new Date(entry.end_datetime);
                if (entry.repeating === 'Everyday') {
                    // Create an entry for each day of the week
                    return Array(7).fill().map((_, dayOfWeek) => ({
                        dayOfWeek: dayOfWeek,
                        startHour: startDateTime.getHours(),
                        endHour: endDateTime.getHours(),
                        event_name: entry.event_name,
                        location: entry.location
                    }));
                } else if (entry.repeating === 'Everyweek' && startDateTime.getDay() >= startOfWeek.getDay() && startDateTime.getDay() <= endOfWeek.getDay()) {
                    // Create an entry for the same day of each week
                    return {
                        dayOfWeek: startDateTime.getDay(),
                        startHour: startDateTime.getHours(),
                        endHour: endDateTime.getHours(),
                        event_name: entry.event_name,
                        location: entry.location
                    };
                } else {
                    return {
                        dayOfWeek: startDateTime.getDay(),
                        startHour: startDateTime.getHours(),
                        endHour: endDateTime.getHours(),
                        event_name: entry.event_name,
                        location: entry.location
                    };
                }
            })
        };

        res.render('schedule', transformedData);
    })


app.listen(3000, function () {
  console.log('App listening on port 3000!');
});