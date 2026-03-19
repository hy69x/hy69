const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Explicit route for the home page (optional, as express.static might handle it)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit route for the game page (optional, as express.static might handle it)
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
