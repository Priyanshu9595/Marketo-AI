import express from 'express'
import YouTubePost from '../models/YouTubePost.js'

const router = express.Router()

router.post('/save-video-id', async (req, res) => {
  try {
    const secret = req.headers['x-shared-secret']

    if (process.env.N8N_SHARED_SECRET && secret !== process.env.N8N_SHARED_SECRET) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized request',
      })
    }

    const {
      title,
      description,
      youtubeVideoId,
      youtubeUrl,
      publishAt,
      status,
    } = req.body

    if (!youtubeVideoId || !youtubeUrl) {
      return res.status(400).json({
        success: false,
        message: 'youtubeVideoId and youtubeUrl are required',
      })
    }

    const post = await YouTubePost.findOneAndUpdate(
      { youtubeVideoId },
      {
        title,
        description,
        youtubeVideoId,
        youtubeUrl,
        publishAt,
        status: status || 'scheduled',
      },
      {
        new: true,
        upsert: true,
      }
    )

    res.json({
      success: true,
      message: 'YouTube video saved successfully',
      post,
    })
  } catch (error) {
    console.error('Save YouTube video error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to save YouTube video',
    })
  }
})

router.get('/posts', async (req, res) => {
  try {
    const posts = await YouTubePost.find().sort({ createdAt: -1 })

    res.json({
      success: true,
      posts,
    })
  } catch (error) {
    console.error('Fetch YouTube posts error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YouTube posts',
    })
  }
})

export default router
