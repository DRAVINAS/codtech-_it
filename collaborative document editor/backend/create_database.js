const mongoose = require('mongoose');

async function createCollections() {
  try {
    await mongoose.connect('mongodb://localhost:27017/collaborative-editor', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    await db.createCollection('users');
    console.log('Users collection created');

    await db.createCollection('documents');
    console.log('Documents collection created');

    await db.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Error:', err);
  }
}

createCollections();