import mongoose from 'mongoose'

const campaignSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:     { type: String, required: true },
    platform: { type: String, default: 'Meta' },
    spend:    { type: Number, default: 0 },
    revenue:  { type: Number, default: 0 },
    clicks:   { type: Number, default: 0 },
    status:   { type: String, default: 'active' },
    start:    { type: String, default: '' },
    end:      { type: String, default: '' },
  },
  { timestamps: true }
)

campaignSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => { delete ret._id },
})

export default mongoose.model('Campaign', campaignSchema)
