import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  console.log('Connected to MongoDB');
  // I will just evaluate the socialController code directly to export and run autoPostDue.
  // Wait, I can't import autoPostDue if it's not exported.
  // Instead, I'll just wait 10 seconds before exiting!
  const { getAll } = await import('./controllers/socialController.js');
  const req = {};
  const res = {
    json: (data) => {
      console.log('Response JSON called');
      // Wait 10 seconds to allow background tasks to complete
      setTimeout(() => {
        console.log('Done waiting. Exiting.');
        process.exit(0);
      }, 10000);
    },
    status: (code) => res
  };
  const next = (err) => {
    console.error('Error:', err);
    process.exit(1);
  };
  await getAll(req, res, next);
});
