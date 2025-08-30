// seed.js

require('dotenv').config(); // Load secrets from our .env file
const { MongoClient } = require('mongodb');
const products = require('./products'); // Import our product data array

async function main() {
    const DATABASE_URL = process.env.DATABASE_URL;
    const client = new MongoClient(DATABASE_URL);

    try {
        // 1. Connect to the database
        await client.connect();
        console.log('Connected to MongoDB Atlas for seeding!');
        
        const db = client.db('borealisStore'); // Get a handle on our database
        const productsCollection = db.collection('products'); // And the specific 'products' collection

        // 2. Clean out the collection before adding new data
        console.log('Deleting existing products...');
        await productsCollection.deleteMany({}); // {} means delete all documents

        // 3. Insert the new data
        console.log('Inserting new seed data...');
        const result = await productsCollection.insertMany(products);
        console.log(`${result.insertedCount} products were successfully imported!`);

    } catch (error) {
        console.error('Error during seeding process:', error);
    } finally {
        // 4. Close the connection, whether it succeeded or failed
        console.log('Closing database connection.');
        await client.close();
    }
}

// Run the main function
main();