import mongoose from 'mongoose'

const youtubePostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    youtubeVideoId: {
      type: String,
      required: true,
      unique: true,
    },
    youtubeUrl: {
      type: String,
      required: true,
    },
    publishAt: {
      type: Date,
    },
    status: {
      type: String,
      default: 'scheduled',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    comments: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

export default mongoose.model('YouTubePost', youtubePostSchema)
