const express = require('express');
const routes = require('./routes');
// const { client, connectToDatabase, closeConnection } = require('./db');

const app = express();
const port = 3000;



app.use(express.json());
app.use('/api', routes);

// connectToDatabase()
//     .catch((error) => console.error('Error during startup', error))
//     .finally(closeConnection);

const server = app.listen(port, () => {
    console.log(`Node server is running on http://localhost:${port}`);
});
