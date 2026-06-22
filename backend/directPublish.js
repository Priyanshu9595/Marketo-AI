import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { publishInstagramPost } from './services/instagramService.js';
import { publishFacebookPost } from './services/facebookService.js';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'marketo' }).then(async () => {
  const Post = mongoose.connection.collection('posts');
  const posts = await Post.find({ posting: true }).toArray();
  for (const post of posts) {
    console.log('Processing post:', post._id, post.platform);
    try {
      let published;
      if (post.platform === 'Instagram') {
        published = await publishInstagramPost({ caption: post.text, mediaUrl: post.mediaUrl, type: post.type, postMethod: post.postMethod });
      } else {
        published = await publishFacebookPost({ caption: post.text, mediaUrl: post.mediaUrl, type: post.type, postMethod: post.postMethod });
      }
      console.log('Published:', published);
    } catch (err) {
      console.error('Publish error:', err.message, err.stack);
    }
    await Post.updateOne({ _id: post._id }, { $set: { posting: false, posted: true, postAttemptCount: 1 } });
    console.log('Updated db');
  }
  process.exit(0);
});
