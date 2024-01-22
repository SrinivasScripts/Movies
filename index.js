const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');  // Add this line


const app = express();
const port = 8080;

const pool = new Pool({
    user: 'srinivas',
    host: '127.0.0.1',
    database: 'moviesdb',
    password: '1234',
    port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your_secret_key', resave: true, saveUninitialized: true }));

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' folder

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/signup', (req, res) => {
    // Render the signup page
    res.sendFile(__dirname + '/public/signup.html');
});
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(__dirname + '/views/dashboard.html');
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username already exists
    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userExists.rows.length > 0) {
        // User already exists
        return res.redirect('/');
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store user details in the database
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    // Redirect to dashboard after successful signup
    res.redirect('/dashboard');
});

app.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    // Check if the username exists
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
        // User does not exist
        return res.redirect('/');
    }

    // Compare the entered password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.rows[0].password);

    if (!passwordMatch) {
        // Incorrect password
        return res.redirect('/');
    }

    // Set userId in session after successful signin
    req.session.userId = user.rows[0].id;

    // Redirect to dashboard after successful signin
    res.redirect('/dashboard');
});
app.post('/createmovie', async (req, res) => {
    // Implement movie creation logic
    const { movie_name, director, hero, heroine, industry, release_year } = req.body;
    const query = 'INSERT INTO movies (movie_name, director, hero, heroine, industry, release_year) VALUES ($1, $2, $3, $4, $5, $6)';
    const values = [movie_name, director, hero, heroine, industry, release_year];

    try {
        await pool.query(query, values);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error creating movie:', error);
        res.redirect('/dashboard'); // Redirect to dashboard even on error for simplicity
    }
});
app.get('/dashboard', async (req, res) => {
    try {
        const movies = await pool.query('SELECT * FROM movies');
        res.json({ movies: movies.rows });
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
