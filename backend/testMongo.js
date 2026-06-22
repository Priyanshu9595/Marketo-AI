import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  console.log('Connected to MongoDB');
  const Post = mongoose.connection.collection('posts');
  const lockCutoff = new Date(Date.now() - 15 * 60 * 1000);

  const post = await Post.findOne({ _id: new mongoose.Types.ObjectId('6a39852e5e05221bb1974f7d') });
  console.log('Found post before update:', post);

  const result = await Post.findOneAndUpdate(
    {
      _id: post._id,
      posted: false,
      $or: [
        { posting: false },
        { posting: { $exists: false } },
        { postingAt: { $lt: lockCutoff } },
      ],
    },
    {
      $set: { posting: true, postingAt: new Date(), lastPostAttemptAt: new Date(), postError: '' },
      $inc: { postAttemptCount: 1 },
    },
    { returnDocument: 'after' }
  );

  console.log('Result of findOneAndUpdate:', result);
  process.exit(0);
});
