import Post from '../models/Post.js'

export async function getAll(req, res, next) {
  try {
    const posts = await Post.find({ user: req.user.id }).sort({ date: 1, time: 1 })
    res.json(posts)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const { platform, type, text, date, time, posted } = req.body
    if (!platform || !text || !date) {
      return res.status(400).json({ error: 'platform, text and date are required' })
    }
    const post = await Post.create({
      user: req.user.id, platform, type: type || 'Text', text,
      date, time: time || '10:00:00', posted: !!posted,
    })
    res.status(201).json(post)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, req.body, { new: true }
    )
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const deleted = await Post.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!deleted) return res.status(404).json({ error: 'Post not found' })
    res.json({ success: true })
  } catch (err) { next(err) }
}
