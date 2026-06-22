// Diagnostic: list posts and compare stored engagement vs a fresh live fetch.
import 'dotenv/config'
import connectDB from '../config/db.js'
import mongoose from 'mongoose'
import Post from '../models/Post.js'
import { fetchEngagement, supportsRealEngagement } from '../services/engagementService.js'

await connectDB()

const posts = await Post.find({}).sort({ createdAt: -1 })
console.log(`\nTotal posts in DB: ${posts.length}\n`)

for (const p of posts) {
  console.log(`• ${p.platform} | ${p.type} | posted=${p.posted} | externalPostId=${p.externalPostId || '(none)'}`)
  console.log(`    stored:  views=${p.views} likes=${p.likes} shares=${p.shares} comments=${p.comments} syncedAt=${p.engagementSyncedAt || '(never)'}`)
  if (supportsRealEngagement(p)) {
    const live = await fetchEngagement(p)
    console.log(`    LIVE:    ${live ? JSON.stringify(live) : '(fetch returned null — token/permission/id issue)'}`)
  } else {
    console.log(`    LIVE:    (not eligible: needs posted Facebook/Instagram with externalPostId)`)
  }
}

await mongoose.disconnect()
process.exit(0)
