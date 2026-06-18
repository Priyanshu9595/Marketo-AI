import Campaign from '../models/Campaign.js'

export async function getAll(req, res, next) {
  try {
    const campaigns = await Campaign.find({ user: req.user.id }).sort({ createdAt: -1 })
    res.json(campaigns)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const { name, platform, spend, revenue, clicks, status, start, end } = req.body
    if (!name || spend === undefined || revenue === undefined) {
      return res.status(400).json({ error: 'name, spend, revenue are required' })
    }
    const campaign = await Campaign.create({
      user: req.user.id, name, platform, spend: +spend, revenue: +revenue,
      clicks: clicks || 0, status: status || 'active', start, end,
    })
    res.status(201).json(campaign)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, req.body, { new: true }
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    res.json(campaign)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const deleted = await Campaign.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' })
    res.json({ success: true })
  } catch (err) { next(err) }
}
