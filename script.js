const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
let currentWeekStart = getStartOfWeek(new Date());

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

    const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('start_datetime', currentWeekStart)
        .lte('end_datetime', currentWeekEnd)
        .eq('user_id', userId);
    if (error) {
        console.log('Error: ', error);
    } else {
        renderSchedule(data);
    }
}

function renderSchedule(events) {
    const scheduleTable = document.getElementById('schedule');
    // clear the previous schedule
    scheduleTable.innerHTML = '';
    // Now render the events for the current week
    events.forEach(event => {
        // Format and insert event into scheduleTable...
    });
}

fetchSchedule();
