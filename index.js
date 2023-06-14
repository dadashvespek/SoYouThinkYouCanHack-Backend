const express = require("express");
const app = express();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
async function chat(prompt) {
  const completion = await openai.ChatCompletion.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
    maxTokens: 64,
    temperature: 0.9,
    topP: 1,
  });

  const reply = completion.choices[0].message.content;
  return reply;
}
const path = require("path");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname)));
app.route("/schedule/:user_id/:weekOffset?").get(async (req, res) => {
  const user_id = req.params.user_id;
  const weekOffset = Number(req.params.weekOffset) || 0; // Defaults to 0 if not provided

  let { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    res.status(500).json({ error: "Failed to fetch data from Supabase" });
    return;
  }

  if (!data) {
    res.json({});
    return;
  }

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

  const weekData = data.filter((entry) => {
    const startDateTime = new Date(entry.start_datetime);
    if (entry.repeating === "Everyday" || entry.repeating === "Everyweek") {
      return true;
    } else {
      return startDateTime >= startOfWeek && startDateTime <= endOfWeek;
    }
  });
  const transformedData = {
    user_id: user_id,
    weekOffset: weekOffset,
    schedule: weekData
      .flatMap((entry) => {
        const startDateTime = new Date(entry.start_datetime);
        const endDateTime = new Date(entry.end_datetime);
        const duration = (endDateTime - startDateTime) / (60 * 60 * 1000); // in hours

        let blocks = [];
        for (let i = 0; i < duration; ) {
          const blockDuration = Math.min(4, duration - i);
          blocks.push({
            dayOfWeek: startDateTime.getDay(),
            startHour: startDateTime.getHours() + i,
            endHour: startDateTime.getHours() + i + blockDuration,
            duration: blockDuration,
            event_name: entry.event_name,
            location: entry.location,
          });
          i += blockDuration;
        }

        if (entry.repeating === "Everyday") {
          // Create an entry for each day of the week
          return Array(7)
            .fill()
            .map((_, dayOfWeek) => {
              return blocks.map((block) => ({
                ...block,
                dayOfWeek: dayOfWeek,
              }));
            })
            .flat();
        } else if (
          entry.repeating === "Everyweek" &&
          startDateTime.getDay() >= startOfWeek.getDay() &&
          startDateTime.getDay() <= endOfWeek.getDay()
        ) {
          // Create an entry for the same day of each week
          return blocks;
        } else {
          return blocks;
        }
      })
      .flat(),
  };

  res.render("schedule", transformedData);
});

app.get("/data/:user_id", async (req, res) => {
    const user_id = req.params.user_id;
  
    // Parse the query parameters
    const { start_datetime, end_datetime, location } = req.query;
  
    // Build the query
    let query = supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user_id);
  
    if (start_datetime) {
      query = query.gte("start_datetime", start_datetime);
    }
  
    if (end_datetime) {
      query = query.lte("end_datetime", end_datetime);
    }
  
    if (location) {
      query = query.eq("location", location);
    }
  
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

  // Parse the query parameters

  console.log(
    `start_datetime: ${start_datetime}, end_datetime: ${end_datetime}, location: ${location}`
  );
  // Filter the data based on the query parameters
  const filteredData = data.filter((entry) => {
    // Default to today's date if date is not provided
    const currentDateTime = new Date();
    const currentDate = currentDateTime.toISOString().split("T")[0];

    let startDateTime = new Date(entry.start_datetime);
    let endDateTime = new Date(entry.end_datetime);

    // Check if the date and time are in the correct format
    const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

    // If a start or end datetime is given but it doesn't contain a time, assume it's at the start or end of the day
    if (start_datetime && !datetimeRegex.test(start_datetime)) {
      startDateTime = new Date(`${start_datetime}T00:00:00`);
    }
    if (end_datetime && !datetimeRegex.test(end_datetime)) {
      endDateTime = new Date(`${end_datetime}T23:59:59`);
    }

    // If a start or end datetime is given but it doesn't contain a date, assume it's today's date
    if (start_datetime && !datetimeRegex.test(start_datetime)) {
      startDateTime = new Date(`${currentDate}T${start_datetime}`);
    }
    if (end_datetime && !datetimeRegex.test(end_datetime)) {
      endDateTime = new Date(`${currentDate}T${end_datetime}`);
    }

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

  filteredData.forEach((entry) => {
    const startDateTime = new Date(entry.start_datetime);
    const endDateTime = new Date(entry.end_datetime);

    const date = startDateTime.toISOString().split("T")[0]; // Get date in YYYY-MM-DD format
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
    const eventSummaries = events.map((event) => {
      return `${event.startTime}-${event.endTime}: ${event.eventName} at ${event.location}`;
    });
    return `${date}: ${eventSummaries.join(", ")}`;
  });

  res.json(result);
});

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

// Retrieve all events for a specific user
app.get("/api/users/:user_id/schedules", async (req, res) => {
  const { user_id } = req.params;
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("user_id", user_id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

// Update a specific event for a specific user
app.put("/api/users/:user_id/schedules", async (req, res) => {
  const { user_id } = req.params;
  const { event_name, location, start_datetime, end_datetime, repeating } =
    req.body;
  const { data, error } = await supabase
    .from("schedules")
    .update({ event_name, location, start_datetime, end_datetime, repeating })
    .eq("user_id", user_id)
    .eq("event_name", event_name)
    .eq("start_datetime", start_datetime)
    .eq("end_datetime", end_datetime);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

// Delete a specific event for a specific user
app.delete("/api/users/:user_id/schedules", async (req, res) => {
  const { user_id } = req.params;
  const { event_name, start_datetime, end_datetime } = req.body;
  const { data, error } = await supabase
    .from("schedules")
    .delete()
    .eq("user_id", user_id)
    .eq("event_name", event_name)
    .eq("start_datetime", start_datetime)
    .eq("end_datetime", end_datetime);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

app.listen(3000, function () {
  console.log("App listening on port 3000!");
});
