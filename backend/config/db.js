import mongoose from 'mongoose'

export default async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env')
    process.exit(1)
  }
  try {
    await mongoose.connect(uri, { dbName: 'marketo' })
    console.log('✅ Connected to MongoDB')
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  }
}
