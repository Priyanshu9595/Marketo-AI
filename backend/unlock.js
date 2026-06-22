import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  const Post = mongoose.connection.collection('posts');
  await Post.updateOne({ _id: new mongoose.Types.ObjectId('6a39852e5e05221bb1974f7d') }, { $set: { posting: false } });
  console.log('Post unlocked');
  process.exit(0);
});
