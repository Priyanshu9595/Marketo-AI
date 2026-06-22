import mongoose from 'mongoose'

// One record per successful AI generation. Its cost is added to the user's
// Total Spend on the dashboard — spend grows automatically as you generate.
const generationSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind:  { type: String, enum: ['copy', 'image', 'video'], required: true },
    title: { type: String, default: '' },
    cost:  { type: Number, default: 0 },
    url:   { type: String, default: '' },
  },
  { timestamps: true }
)

generationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => { delete ret._id },
})

export default mongoose.model('Generation', generationSchema)
