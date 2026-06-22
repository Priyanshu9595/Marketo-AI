import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, default: 'Instagram' },
    type:     { type: String, default: 'Text message' },
    postMethod: { type: String, default: 'Feed' },
    text:     { type: String, required: true },
    mediaUrl: { type: String, default: '' },
    date:     { type: String, required: true },   // 'YYYY-MM-DD'
    time:     { type: String, default: '10:00:00' }, // 'HH:MM:SS'
    views:    { type: Number, default: 0 },
    likes:    { type: Number, default: 0 },
    shares:   { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    engagementSyncedAt: { type: Date }, // last time real platform metrics were fetched
    deleted:  { type: Boolean, default: false }, // soft-deleted: kept in history, excluded from totals
    posted:   { type: Boolean, default: false },
    posting: { type: Boolean, default: false },
    postingAt: { type: Date },
    lastPostAttemptAt: { type: Date },
    nextPostAttemptAt: { type: Date },
    postAttemptCount: { type: Number, default: 0 },
    autoPosted: { type: Boolean, default: false },
    postedAt: { type: Date },
    externalPostId: { type: String, default: '' },
    postError: { type: String, default: '' },
    youtubeTitle: { type: String, default: '' },
    youtubeDescription: { type: String, default: '' },
    youtubeTags: { type: String, default: '' },
    rpm: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
  },
  { timestamps: true }
)

postSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => { delete ret._id },
})

export default mongoose.model('Post', postSchema)
