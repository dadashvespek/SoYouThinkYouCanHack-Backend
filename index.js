const express = require("express");
const app = express();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
app.use(express.json());

const path = require("path");
const { start } = require("repl");
const { log } = require("console");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname)));
const DAYS_IN_WEEK = 7;
const BLOCK_DURATION = 4;

function Proper(str) {
  return str.replace(/\b\w/g, function(l) {
    return l.toUpperCase();
  });
}

// Function to get the start and end dates of a week
function getWeekBoundaries(weekOffset) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * DAYS_IN_WEEK);
  const currentDayOfWeek = currentDate.getDay();
  console.log(`currentDayOfWeek: ${currentDayOfWeek}`)

  const startOfWeek = new Date(
    currentDate.setDate(
      currentDate.getDate() -
        currentDayOfWeek +
        (currentDayOfWeek === 0 ? -6 : 1)
    )
  );
  const endOfWeek = new Date(
    currentDate.setDate(currentDate.getDate() - currentDayOfWeek + DAYS_IN_WEEK)
  );

  return { startOfWeek, endOfWeek };
}

// Function to create the blocks for a given entry
function createBlocks(entry) {
  const startDateTime = new Date(entry.start_datetime);
  const endDateTime = new Date(entry.end_datetime);
  const duration = (endDateTime - startDateTime) / (60 * 60 * 1000); // in hours

  let blocks = [];
  for (let i = 0; i < duration; i += BLOCK_DURATION) {
    const blockDuration = Math.min(BLOCK_DURATION, duration - i);
    blocks.push({
      dayOfWeek: startDateTime.getDay(),
      startHour: startDateTime.getHours() + i,
      endHour: startDateTime.getHours() + i + blockDuration,
      duration: blockDuration,
      event_name: entry.event_name,
      location: entry.location,
    });
  }

  return blocks;
}

app.route("/schedule/:user_id/:weekOffset?").get(async (req, res) => {
  let { user_id, weekOffset = 0 } = req.params;
  user_id = Proper(user_id);
  
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * 7); // Apply week offset
  const currentDayOfWeek = currentDate.getDay();

  // Calculate start (Monday) of the week
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(
    startOfWeek.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)
  );
  
  // Calculate end (Sunday) of the week
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  
  console.log(`startofweek: ${startOfWeek}`);
  console.log(`endofweek: ${endOfWeek}`);

  let { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("user_id", Proper(user_id));

  if (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch data from Supabase" });
  }

  if (!data) {
    return res.json({});
  }

  const weekData = data.filter((entry) => {
    const startDateTime = new Date(entry.start_datetime);
    const isEverydayOrEveryweek = ["Everyday", "Everyweek"].includes(
      entry.repeating
    );
    console.log(
      isEverydayOrEveryweek ||
        (startDateTime >= startOfWeek && startDateTime <= endOfWeek)
    );
    return (
      isEverydayOrEveryweek ||
      (startDateTime >= startOfWeek && startDateTime <= endOfWeek)
    );
  });

  const transformedData = {
    user_id,
    weekOffset,
    schedule: weekData.flatMap((entry) => {
      const blocks = createBlocks(entry);
      const startDateTime = new Date(entry.start_datetime);

      if (entry.repeating === "Everyday") {
        return Array(DAYS_IN_WEEK)
          .fill()
          .map((_, dayOfWeek) =>
            blocks.map((block) => ({ ...block, dayOfWeek }))
          )
          .flat();
      } else if (
        entry.repeating === "Everyweek" &&
        startDateTime.getDay() >= startOfWeek.getDay() &&
        startDateTime.getDay() <= endOfWeek.getDay()
      ) {
        return blocks;
      } else {
        return blocks;
      }
    }),
  };

  res.render("schedule", transformedData);
});

app.get("/data/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  const { start_datetime, end_datetime } = req.query;
  console.log(`start_datetime: ${start_datetime}`);
  console.log(`end_datetime: ${end_datetime}`);

  // Build the query
  let query = supabase.from("schedules").select("*").eq("user_id", Proper(user_id));

  // Fetch the data from Supabase
  let { data, error } = await query;

  if (error) {
    res.status(500).json({ error: "Failed to fetch data from Supabase" });
    return;
  }

  if (!data) {
    res.json({ message: "No events data found for this user" });
    return;
  }

  console.log("data is", JSON.stringify(data, null, 2));

  // console.log(`filterData: ${filterData(data, start_datetime, end_datetime)}`);
  const filteredData = filterData(data, start_datetime, end_datetime);
  const consolidatedData = consolidateData(
    filteredData,
    start_datetime,
    end_datetime
  );
  const result = formatResult(consolidatedData);
  // console.log(`result: ${result}`);
  if (
    result === "" ||
    result === undefined ||
    result === null ||
    (Array.isArray(result) && result.length === 0)
  ) {
    res.send(`No schedule data found for the given time frame:${user_id}}`);
    return;
  }

  res.json(result);
});

function filterData(data, start_datetime, end_datetime) {
  // Parse input strings into Date objects
  let start = new Date(start_datetime);
  let end = new Date(end_datetime);

  // Filter data
  let filteredData = data.filter((event) => {
    // Parse event datetime strings into Date objects
    let eventStart = new Date(event.start_datetime);
    let eventEnd = new Date(event.end_datetime);

    // Check if event falls within the given period
    // An event is considered within the period if it starts or ends within the period
    return (
      (eventStart >= start && eventStart <= end) ||
      (eventEnd >= start && eventEnd <= end)
    );
  });
  console.log(`starttime: ${start}`);
  console.log(`endtime: ${end}`);
  console.log(`filteredData: ${JSON.stringify(filteredData)}`);
  // console.log(JSON.stringify(data, null, 2));

  return filteredData;
}

function consolidateData(data, start_datetime, end_datetime) {
  const windowStart = start_datetime ? new Date(start_datetime) : null;
  const windowEnd = end_datetime ? new Date(end_datetime) : null;
  const consolidatedData = {};

  data.forEach((entry) => {
    const startDateTime = new Date(entry.start_datetime);
    const endDateTime = new Date(entry.end_datetime);

    if (entry.repeating === "Everyweek") {
      while (startDateTime < windowStart) {
        startDateTime.setDate(startDateTime.getDate() + 7);
        endDateTime.setDate(endDateTime.getDate() + 7);
      }
      while (startDateTime > windowEnd) {
        startDateTime.setDate(startDateTime.getDate() - 7);
        endDateTime.setDate(endDateTime.getDate() - 7);
      }
    }

    if (entry.repeating === "Everyday") {
      const dateCursor = new Date(windowStart);

      while (dateCursor <= windowEnd) {
        const date = dateCursor.toISOString().split("T")[0]; // Get date in YYYY-MM-DD format
        if (!consolidatedData[date]) {
          consolidatedData[date] = [];
        }

        const allDay =
          startDateTime.getHours() === 0 && endDateTime.getHours() === 0;
        consolidatedData[date].push({
          startTime: allDay ? "All day" : startDateTime.getHours(),
          endTime: allDay ? "" : endDateTime.getHours(),
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
    const allDay =
      startDateTime.getHours() === 0 && endDateTime.getHours() === 0;

    if (!consolidatedData[date]) {
      consolidatedData[date] = [];
    }

    consolidatedData[date].push({
      startTime: allDay ? "All day" : startDateTime.getHours(),
      endTime: allDay ? "" : endDateTime.getHours(),
      eventName: entry.event_name,
      location: entry.location,
    });
  });

  console.log(`consolidatedData: ${JSON.stringify(consolidatedData)}`);

  return consolidatedData;
}

function formatResult(consolidatedData) {
  return Object.entries(consolidatedData).map(([date, events]) => {
    const eventSummaries = events.map((event) => {
      const timeFormat =
        event.startTime === "All day"
          ? "All day"
          : `${event.startTime}-${event.endTime}`;
      return `${timeFormat}: ${event.eventName} ${
        event.location ? "at" + event.location : ""
      }`;
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
    res.status(200).json({
      success: true,
      message: `Event '${event_name}' was created successfully for user ${user_id}.`,
      event: data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/savetosupabase", async (req, res) => {
  try {
    const { user_id, events } = req.body;

    // Check if user_id exists
    if (!user_id) {
      res.status(400).json({ error: "Missing user_id in the request body." });
      return;
    }

    // Prepare data for insert operation
    const insertData = events.map((event) => ({
      user_id: user_id,
      event_name: event.event_name,
      location: event.location,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
    }));

    const { data, error } = await supabase.from("schedules").insert(insertData);

    if (error) throw error;

    console.log(`Events were created successfully for user ${user_id}.`);
    console.log(`data: ${data}`);

    res.status(200).json({
      success: true,
      message: `Events were created successfully for user ${user_id}.`,
      events: data,
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
    res.status(200).json({
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
    res.status(200).json({
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
    res.status(200).json({
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
