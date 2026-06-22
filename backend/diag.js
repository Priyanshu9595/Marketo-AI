import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  console.log('Connected to MongoDB');
  try {
    const { getAll } = await import('./controllers/socialController.js');
    const req = {};
    const res = {
      json: (data) => console.log('Response JSON called'),
      status: (code) => res
    };
    const next = (err) => console.error('Error:', err);
    await getAll(req, res, next);
    // Wait for the background task
    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('Finished waiting. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('Unhandled script error:', err);
    process.exit(1);
  }
});
