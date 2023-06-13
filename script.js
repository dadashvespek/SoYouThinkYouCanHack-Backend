
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Function to fetch schedule data for a given week
  const fetchScheduleData = async (startOfWeek) => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const { data, error } = await supabase
      .from('your_table_name')
      .select()
      .gte('start_datetime', startOfWeek.toISOString())
      .lte('end_datetime', endOfWeek.toISOString());
      
    if (error) {
      console.error('Error fetching schedule data:', error);
    }
    
    return data;
  };

  // Function to render the schedule
  const renderSchedule = (scheduleData) => {
    const scheduleContainer = document.getElementById('schedule');
    scheduleContainer.innerHTML = ''; // Clear previous schedule
    
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    daysOfWeek.forEach((day) => {
      const headerCell = document.createElement('th');
      headerCell.textContent = day;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);
    
    const scheduleRows = scheduleData.reduce((rows, event) => {
      const startDateTime = new Date(event.start_datetime);
      const endDateTime = new Date(event.end_datetime);
      const startDay = startDateTime.getDay(); // 0 for Sunday, 1 for Monday, etc.
      const endDay = endDateTime.getDay();
      const rowSpan = endDay - startDay + 1;
      
      for (let i = 0; i < rowSpan; i++) {
        const rowIndex = startDay + i;
        if (!rows[rowIndex]) {
          rows[rowIndex] = document.createElement('tr');
        }
        
        const cell = document.createElement('td');
        cell.textContent = event.event_name;
        rows[rowIndex].appendChild(cell);
        
        // Apply additional styling if the event is repeating
        if (event.repeating) {
          cell.classList.add('repeating-event');
        }
      }
      
      return rows;
    }, []);
    
    scheduleRows.forEach((row) => table.appendChild(row));
    scheduleContainer.appendChild(table);
  };

  // Function to handle previous week button click
  const handlePreviousWeek = () => {
    // Calculate the start date of the previous week
    const currentWeekStart = new Date(); // Assuming the current week is displayed initially
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    fetchScheduleData(previousWeekStart).then(renderSchedule);
  };

  // Function to handle next week button click
  const handleNextWeek = () => {
    // Calculate the start date of the next week
    const currentWeekStart = new Date(); // Assuming the current week is displayed initially
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    
    fetchScheduleData(nextWeekStart).then(renderSchedule);
  };

  // Attach event listeners to the buttons
  document.getElementById('previousBtn').addEventListener('click', handlePreviousWeek);
  document.getElementById('nextBtn').addEventListener('click', handleNextWeek);

  // Initially fetch and render the current week's schedule
  fetchScheduleData(new Date()).then(renderSchedule);