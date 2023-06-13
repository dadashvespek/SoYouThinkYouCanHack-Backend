const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const path = require('path');
app.use(express.static(path.join(__dirname)));

// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Enable express to parse json and url-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//add user
app.post('/addUser', async (req, res) => {
    const userData = req.body;
    const { data, error } = await supabase
        .from('users')
        .insert([
            { ...userData }
        ]);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
});


app.get('/getUser/:userid', async (req, res) => {
    const userid = req.params.userid;
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('userid', userid);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data });
});

// This route updates an existing user in the database
app.put('/updateUser/:userid', async (req, res) => {
  const userid = req.params.userid;
  const updatedFields = req.body;
  const { data, error } = await supabase
    .from('users')
    .update(updatedFields)
    .match({ userid });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});

// This route deletes a user from the database
app.delete('/deleteUser/:userid', async (req, res) => {
  const userid = req.params.userid;
  const { data, error } = await supabase
    .from('users')
    .delete()
    .match({ userid });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
});


  
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});