const { Client } = require('pg');
const dotenv = require('dotenv').config({ path: __dirname + '/.env' });

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const connectToDatabase = async () => {
    try {
        await client.connect();
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database', error);
    }
};

const closeConnection = async () => {
    try {
        await client.end();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error closing the database connection', error);
    }
};

const query = async (text, values) => {
    try {
        const result = await client.query(text, values);
        return result.rows;
    } catch (error) {
        console.error('Error executing database query', error);
        throw error;
    }
};

module.exports = {
    connectToDatabase,
    closeConnection,
    query,
};
