import mongoose from 'mongoose'

function connectionOptions(uri) {
  if (process.env.MONGODB_DB_NAME) {
    return { dbName: process.env.MONGODB_DB_NAME }
  }

  try {
    const parsed = new URL(uri)
    const dbFromUri = parsed.pathname.replace(/^\/+/, '')
    return dbFromUri ? {} : { dbName: 'marketo' }
  } catch {
    return { dbName: 'marketo' }
  }
}

export default async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set in .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(uri, connectionOptions(uri))
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}`)
  } catch (err) {
    console.error('MongoDB connection failed:', err.message)
    process.exit(1)
  }
}
