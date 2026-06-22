import Campaign from '../models/Campaign.js'
import { recomputeAutoCampaign } from '../services/autoCampaignService.js'
import { companyOwnerId } from '../utils/companyWorkspace.js'

const nowLocal = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const dateTimeValue = (date, time, fallbackTime) => {
  if (!date) return ''
  return `${date}T${time || fallbackTime}`
}

const automaticStatus = ({ start, startTime, end, endTime, status }) => {
  const now = nowLocal()
  const startAt = dateTimeValue(start, startTime, '00:00')
  const endAt = dateTimeValue(end, endTime, '23:59')

  if (startAt && now < startAt) return 'scheduled'
  if (endAt && now > endAt) return 'paused'
  return status && !['scheduled', 'paused'].includes(status) ? status : 'active'
}

const withAutomaticStatus = (campaign) => {
  const data = campaign.toJSON ? campaign.toJSON() : campaign
  return { ...data, status: automaticStatus(data) }
}

export async function getAll(req, res, next) {
  try {
    // Keep the auto campaign's engagement revenue fresh for the dashboard.
    await recomputeAutoCampaign()
    const campaigns = await Campaign.find({}).sort({ createdAt: -1 })
    const updated = await Promise.all(campaigns.map(async campaign => {
      const status = automaticStatus(campaign)
      if (campaign.status !== status) {
        campaign.status = status
        await campaign.save()
      }
      return withAutomaticStatus(campaign)
    }))
    res.json(updated)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const { name, platform, spend, revenue, clicks, status, start, startTime, end, endTime } = req.body
    if (!name || spend === undefined || revenue === undefined) {
      return res.status(400).json({ error: 'name, spend, revenue are required' })
    }
    const finalStatus = automaticStatus({ start, startTime, end, endTime, status })
    const campaign = await Campaign.create({
      user: companyOwnerId(), name, platform, spend: +spend, revenue: +revenue,
      clicks: clicks || 0, status: finalStatus, start, startTime, end, endTime,
    })
    res.status(201).json(withAutomaticStatus(campaign))
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const fields = { ...req.body }
    fields.status = automaticStatus(fields)
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, auto: { $ne: true } }, fields, { new: true }
    )
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    res.json(withAutomaticStatus(campaign))
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const deleted = await Campaign.findOneAndDelete({ _id: req.params.id, auto: { $ne: true } })
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' })
    res.json({ success: true })
  } catch (err) { next(err) }
}
