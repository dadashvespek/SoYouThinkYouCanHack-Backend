import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Constants for week navigation
const oneWeek = 7 * 24 * 60 * 60 * 1000;
let currentWeekStart = new Date();
currentWeekStart.setHours(0, 0, 0, 0);
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1); // Set to the start of the current week

// Event handlers for week navigation
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekStart = new Date(currentWeekStart.getTime() - oneWeek);
  renderWeek();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart = new Date(currentWeekStart.getTime() + oneWeek);
  renderWeek();
});

// Function to render the week's schedule
async function renderWeek() {
  // Clear the current schedule
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  days.forEach(day => document.getElementById(day).innerHTML = '');

  // Query the database for events in the current week
  const currentWeekEnd = new Date(currentWeekStart.getTime() + oneWeek);
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .gte('start_datetime', currentWeekStart)
    .lt('start_datetime', currentWeekEnd);

  if (error) {
    console.error('Error fetching schedule:', error);
    return;
  }

  // Add each event to the appropriate day
  data.forEach(event => {
    const dayOfWeek = new Date(event.start_datetime).getDay();
    const dayElement = document.getElementById(days[dayOfWeek]);
    const eventElement = document.createElement('div');
    eventElement.innerText = `${event.event_name} at ${event.location} from ${event.start_datetime} to ${event.end_datetime}`;
    dayElement.appendChild(eventElement);
  });
}

// Initial render
renderWeek();
