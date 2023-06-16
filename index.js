const express = require("express");
const app = express();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
app.use(express.json());

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
async function chat(message) {
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [{"role": "system", "content": "you are an assistant that converts natural language to the correct format json"}, {role: "user", content: `${message}`}],
  });
  console.log(completion.data.choices[0].message.content);
  return completion.data.choices[0].message.content;
}

const path = require("path");
const { start } = require("repl");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname)));
app.route("/schedule/:user_id/:weekOffset?").get(async (req, res) => {
  const user_id = req.params.user_id;
  const weekOffset = Number(req.params.weekOffset) || 0; // Defaults to 0 if not provided
  const userSchedule = req.body.userSchedule || []; // Defaults to empty array if not provided

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * 7); // Apply week offset
  const currentDayOfWeek = currentDate.getDay();
  // Calculate start (Monday) and end (Sunday) of the week
  const startOfWeek = new Date(
    currentDate.setDate(
      currentDate.getDate() -
        currentDayOfWeek +
        (currentDayOfWeek === 0 ? -6 : 1)
    )
  );
  const endOfWeek = new Date(
    currentDate.setDate(currentDate.getDate() - currentDayOfWeek + 7)
  );

  const weekData = userSchedule.filter((entry) => {
    const startDateTime = new Date(entry.start);
    return startDateTime >= startOfWeek && startDateTime <= endOfWeek;
  });

  const transformedData = {
    user_id: user_id,
    weekOffset: weekOffset,
    schedule: weekData
      .flatMap((entry) => {
        const startDateTime = new Date(entry.start);
        const endDateTime = new Date(entry.end);
        const duration = (endDateTime - startDateTime) / (60 * 60 * 1000); // in hours

        let blocks = [];
        for (let i = 0; i < duration; ) {
          const blockDuration = Math.min(4, duration - i);
          blocks.push({
            dayOfWeek: startDateTime.getDay(),
            startHour: startDateTime.getHours() + i,
            endHour: startDateTime.getHours() + i + blockDuration,
            duration: blockDuration,
            event_name: entry.summary,
            location: entry.location,
          });
          i += blockDuration;
        }
        return blocks;
      })
      .flat(),
  };

  res.render("schedule", transformedData);
});







app.post('/api', (req, res) => {
  const eventData = req.body;

  // Process the eventData as needed
  console.log('Received event data:', eventData);

  // Send a response back if necessary
  res.json({ message: 'Event data received successfully' });
});








app.get("/data/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  const { start_datetime, end_datetime } = await validateJson(req.query);

  // Build the query
  let query = supabase
  .from("schedules")
  .select("*")
  .eq("user_id", user_id);

// Fetch the data from Supabase
let { data, error } = await query;

if (error) {
  res.status(500).json({ error: "Failed to fetch data from Supabase" });
  return;
}

if (!data) {
  res.json({});
  return;
}


  const filteredData = filterData(data, start_datetime, end_datetime);
  const consolidatedData = consolidateData(filteredData, start_datetime, end_datetime);
  const result = formatResult(consolidatedData);

  res.json(result);
});

async function validateJson(query) {
  if (JSON.stringify(query) === '{}') {
    return {};
  }

  const response = await chat(`convert this to a formatted json, it should have this format: \`\`\`{ "start_datetime": "YYYY-MM-DDTHH:MM:SS", "end_datetime": "YYYY-MM-DDTHH:MM:SS"}\`\`\` note that today's date is ${new Date()} use this as reference, so \`tomorrow\` would be ${new Date(new Date().getTime() + 24 * 60 * 60 * 1000)}, not provided json:${JSON.stringify(query)}}, reply with ONLY ONE line which is the validated json, validated json:`);

  if (response) {
    console.log('Validated JSON:', response);
    return JSON.parse(response);
  } else {
    console.error('Error occurred while validating JSON.');
    return {};
  }
}

function filterData(data, start_datetime, end_datetime) {
  return data.filter((entry) => {
    const currentDateTime = new Date();
    const currentDate = currentDateTime.toISOString().split("T")[0];
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    let startDateTime = new Date(entry.start_datetime);
    let endDateTime = new Date(entry.end_datetime);

    if (entry.repeating === "Everyday") {
      return true;
    }

    if (entry.repeating === "Everyweek") {
      const startWeekday = startDateTime.getUTCDay();
      const windowStart = new Date(start_datetime || `${currentDate}T00:00:00`);
      const windowEnd = new Date(end_datetime || `${currentDate}T23:59:59`);
      const windowStartWeekday = windowStart.getUTCDay();
      const windowEndWeekday = windowEnd.getUTCDay();
      // If the event's start weekday is within the range, include it
      if (windowStartWeekday <= startWeekday && startWeekday <= windowEndWeekday) {
        return true;
      }
    }

    if (start_datetime && !datetimeRegex.test(start_datetime)) {
      startDateTime = new Date(`${start_datetime}T00:00:00`);
    }
    if (end_datetime && !datetimeRegex.test(end_datetime)) {
      endDateTime = new Date(`${end_datetime}T23:59:59`);
    }

    if (start_datetime && !datetimeRegex.test(start_datetime)) {
      startDateTime = new Date(`${currentDate}T${start_datetime}`);
    }
    if (end_datetime && !datetimeRegex.test(end_datetime)) {
      endDateTime = new Date(`${currentDate}T${end_datetime}`);
    }

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
    return true;
  });
}


function consolidateData(data, start_datetime, end_datetime) {
  const windowStart = start_datetime ? new Date(start_datetime) : null;
  const windowEnd = end_datetime ? new Date(end_datetime) : null;
  const consolidatedData = {};

  data.forEach((entry) => {
    const startDateTime = new Date(entry.start_datetime);
    const endDateTime = new Date(entry.end_datetime);

        if (entry.repeating === 'Everyweek') {
            while (startDateTime < windowStart) {
                startDateTime.setDate(startDateTime.getDate() + 7);
                endDateTime.setDate(endDateTime.getDate() + 7);
            }
            while (startDateTime > windowEnd) {
                startDateTime.setDate(startDateTime.getDate() - 7);
                endDateTime.setDate(endDateTime.getDate() - 7);
            }
        }

        if (entry.repeating === 'Everyday') {
            const dateCursor = new Date(windowStart);

            while (dateCursor <= windowEnd) {
                const date = dateCursor.toISOString().split('T')[0]; // Get date in YYYY-MM-DD format
                if (!consolidatedData[date]) {
                    consolidatedData[date] = [];
                }
                
                consolidatedData[date].push({
                    startTime: startDateTime.getHours(),
                    endTime: endDateTime.getHours(),
                    eventName: entry.event_name,
                    location: entry.location,
                });

                // Advance to next day
                dateCursor.setDate(dateCursor.getDate() + 1);
            }

            // Skip the usual event addition logic for 'Everyday' events
            return;
        }

    const date = startDateTime.toISOString().split("T")[0];
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

  return consolidatedData;
}

function formatResult(consolidatedData) {
  return Object.entries(consolidatedData).map(([date, events]) => {
    const eventSummaries = events.map((event) => {
      return `${event.startTime}-${event.endTime}: ${event.eventName} at ${event.location}`;
    });
    return `${date}: ${eventSummaries.join(", ")}`;
  });
}

// Register a new user
app.post("/api/users", async (req, res) => {
const { user_id, name, email, password } = req.body;
const { data, error } = await supabase
  .from("users")
  .insert([{ user_id, name, email, password }]);

if (error) return res.status(500).json({ error: error.message });
return res.status(200).json(data);
});

// Create a new event for a specific user
app.post("/api/users/:user_id/schedules", async (req, res) => {
const { user_id } = req.params;
const { event_name, location, start_datetime, end_datetime, repeating } =
  req.body;
const { data, error } = await supabase.from("schedules").insert([
  {
    user_id,
    event_name,
    location,
    start_datetime,
    end_datetime,
    repeating,
  },
]);

if (error) return res.status(500).json({ error: error.message });
return res.status(200).json(data);
});




// Create a new event for a specific user
app.post("/api/users/:user_id/schedules", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { event_name, location, start_datetime, end_datetime, repeating } =
      req.body;
    const { data, error } = await supabase.from("schedules").insert([
      {
        user_id,
        event_name,
        location,
        start_datetime,
        end_datetime,
        repeating,
      },
    ]);
    if (error) throw error;
    res
      .status(200)
      .json({
        success: true,
        message: `Event '${event_name}' was created successfully for user ${user_id}.`,
        event: data,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve all events for a specific user
app.get("/api/users/:user_id/schedules", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user_id);
    if (error) throw error;
    res
      .status(200)
      .json({
        success: true,
        message: `Retrieved all events for user ${user_id}.`,
        events: data,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a specific event for a specific user
app.put("/api/users/:user_id/schedules", async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      old_event_name,
      old_start_datetime,
      old_end_datetime,
      event_name,
      location,
      start_datetime,
      end_datetime,
      repeating,
    } = req.body;
    const { data, error } = await supabase
      .from("schedules")
      .update({ event_name, location, start_datetime, end_datetime, repeating })
      .eq("user_id", user_id)
      .eq("event_name", old_event_name)
      .eq("start_datetime", old_start_datetime)
      .eq("end_datetime", old_end_datetime);
    if (error) throw error;
    res
      .status(200)
      .json({
        success: true,
        message: `Event '${old_event_name}' for user ${user_id} was updated successfully.`,
        event: data,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific event for a specific user
app.delete("/api/users/:user_id/schedules", async (req, res) => {
  try {
    const { user_id } = req.params;
    const { event_name, start_datetime, end_datetime } = req.body;
    const { data, error } = await supabase
      .from("schedules")
      .delete()
      .eq("user_id", user_id)
      .eq("event_name", event_name)
      .eq("start_datetime", start_datetime)
      .eq("end_datetime", end_datetime);
    if (error) throw error;
    res
      .status(200)
      .json({
        success: true,
        message: `Event '${event_name}' for user ${user_id} was deleted successfully.`,
        event: data,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, function () {
  console.log("App listening on port 3000!");
});

