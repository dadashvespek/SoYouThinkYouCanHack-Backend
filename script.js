const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fetchSchedule(userId) {
    // Get the current week range
    let now = new Date();
    let firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
    let lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));

    // Fetch the schedule from Supabase
    let { data: events, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .gte('start_datetime', firstDay)
        .lte('end_datetime', lastDay);
        
    if(error) {
        console.error("Error fetching schedule", error);
        throw error;
    }
    
    // Organize the events into a suitable data structure
    let organizedEvents = organizeEvents(events);

    // Generate the HTML of the schedule
    let scheduleHTML = generateScheduleHTML(organizedEvents);

    return scheduleHTML;
}

function organizeEvents(events) {
    const organizedEvents = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    daysOfWeek.forEach(day => {
        organizedEvents[day] = {};
        for (let hour = 0; hour < 24; hour++) {
            organizedEvents[day][hour] = [];
        }
    });

    events.forEach(event => {
        const startDay = daysOfWeek[new Date(event.start_datetime).getDay()];
        const endDay = daysOfWeek[new Date(event.end_datetime).getDay()];
        const startHour = new Date(event.start_datetime).getHours();
        const endHour = new Date(event.end_datetime).getHours();

        if (event.repeating === 'Everyday') {
            daysOfWeek.forEach(day => {
                for (let hour = startHour; hour <= endHour; hour++) {
                    organizedEvents[day][hour].push(event);
                }
            });
        } else if (event.repeating === 'Everyweek' && startDay === endDay) {
            for (let hour = startHour; hour <= endHour; hour++) {
                organizedEvents[startDay][hour].push(event);
            }
        } else {
            for (let hour = startHour; hour <= endHour; hour++) {
                organizedEvents[startDay][hour].push(event);
            }
        }
    });

    return organizedEvents;
}

function generateScheduleHTML(organizedEvents) {
    let scheduleHTML = '<table><tr><th>Time/Day</th>';
    const daysOfWeek = Object.keys(organizedEvents);

    daysOfWeek.forEach(day => {
        scheduleHTML += `<th>${day}</th>`;
    });

    scheduleHTML += '</tr>';

    for (let hour = 0; hour < 24; hour++) {
        scheduleHTML += `<tr><td>${hour}:00 - ${hour+1}:00</td>`;

        daysOfWeek.forEach(day => {
            scheduleHTML += '<td>';
            organizedEvents[day][hour].forEach(event => {
                scheduleHTML += `<p>${event.event_name} - ${event.location}</p>`;
            });
            scheduleHTML += '</td>';
        });

        scheduleHTML += '</tr>';
    }

    scheduleHTML += '</table>';

    return scheduleHTML;
}

module.exports = { fetchSchedule };
