const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
let currentWeekStart = getStartOfWeek(new Date());

function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6:1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
}


document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    fetchSchedule();
});

document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    fetchSchedule();
});

async function fetchSchedule() {
    const userId = window.location.pathname.split('/').pop();
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

    const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .gte('start_datetime', currentWeekStart)
        .lte('end_datetime', currentWeekEnd);
    if (scheduleError) {
        console.log('Error: ', scheduleError);
    }

    const { data: repeatData, error: repeatError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .in('repeating', ['Everyday', 'Everyweek']);
    if (repeatError) {
        console.log('Error: ', repeatError);
    }

    let data = [];
    if (scheduleData) data = [...data, ...scheduleData];
    if (repeatData) data = [...data, ...repeatData];
    renderSchedule(data);
}


function renderSchedule(events) {
    const scheduleTable = document.getElementById('schedule');
    scheduleTable.innerHTML = '';

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let table = '<tr><th>Time</th>';

    // Create table header
    for (let i = 0; i < 7; i++) {
        table += `<th>${daysOfWeek[i]}</th>`;
    }
    table += '</tr>';

    // Create rows for each hour of each day
    for (let hour = 0; hour < 24; hour++) {
        table += `<tr><td>${hour}:00 - ${hour + 1}:00</td>`;
        for (let day = 0; day < 7; day++) {
            const event = events.find(e => {
                const startDay = e.start_datetime.getDay();
                const endDay = e.end_datetime.getDay();
                const startHour = e.start_datetime.getHours();
                const endHour = e.end_datetime.getHours();

                return ((e.repeating === 'Everyday') || 
                        (e.repeating === 'Everyweek' && startDay === day) || 
                        (startDay === day && startHour <= hour && endHour > hour));
            });
            if (event) {
                table += `<td>${event.event_name}<br>${event.location}</td>`;
            } else {
                table += '<td></td>';
            }
        }
        table += '</tr>';
    }

    scheduleTable.innerHTML = table;
}

fetchSchedule();
