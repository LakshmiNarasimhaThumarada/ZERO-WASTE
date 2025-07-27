const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Static server running on http://localhost:${port}`);
}); 