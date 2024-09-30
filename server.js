const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Connect to SQLite database
const dbPath = path.join(__dirname, 'db', 'database.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');

    // Create User and Address tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Address (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      address TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`);
  }
});

// Redirect root URL (/) to /register
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Serve the registration form
app.get('/register', (req, res) => {
  res.send(`
    <h2>User Registration</h2>
    <form action="/register" method="POST">
      <label for="name">Name:</label><br>
      <input type="text" id="name" name="name" required><br>
      
      <label for="address">Address:</label><br>
      <input type="text" id="address" name="address" required><br>
      
      <input type="submit" value="Register">
    </form>
  `);
});

// Route to handle form submission (registering user and address)
app.post('/register', (req, res) => {
  const { name, address } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required.' });
  }

  // Insert user into the User table
  db.run(`INSERT INTO User (name) VALUES (?)`, [name], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error creating user.' });
    }

    const userId = this.lastID;

    // Insert address into the Address table
    db.run(`INSERT INTO Address (userId, address) VALUES (?, ?)`, [userId, address], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Error creating address.' });
      }

      // Redirect to the /users route to show the table data
      res.redirect('/users');
    });
  });
});

// Route to display all users and their addresses in JSON format
app.get('/users', (req, res) => {
  const query = `
    SELECT User.id, User.name, Address.address
    FROM User
    JOIN Address ON User.id = Address.userId
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Error fetching data.' });
    }

    // Transform the data into JSON format
    const users = rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address
    }));

    // Send the JSON response
    res.json(users);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});