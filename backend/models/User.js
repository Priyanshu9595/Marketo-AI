import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true }
)

// Hash the password before saving (only when it changed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Never expose the password hash in API responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  obj.id = obj._id
  delete obj._id
  delete obj.__v
  return obj
}

export default mongoose.model('User', userSchema)
