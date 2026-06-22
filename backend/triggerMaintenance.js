import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getAll } from './controllers/socialController.js';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  console.log('Connected to MongoDB');
  const req = {};
  const res = {
    json: (data) => {
      console.log('Response JSON called');
      process.exit(0);
    },
    status: (code) => res
  };
  const next = (err) => {
    console.error('Error:', err);
    process.exit(1);
  };
  await getAll(req, res, next);
});
