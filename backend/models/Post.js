import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, default: 'Instagram' },
    type:     { type: String, default: 'Text' }, // Text | Image | Video
    text:     { type: String, required: true },
    date:     { type: String, required: true },   // 'YYYY-MM-DD'
    time:     { type: String, default: '10:00:00' }, // 'HH:MM:SS'
    posted:   { type: Boolean, default: false },
  },
  { timestamps: true }
)

postSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => { delete ret._id },
})

export default mongoose.model('Post', postSchema)
