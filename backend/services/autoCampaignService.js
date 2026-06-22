import Campaign from '../models/Campaign.js'
import Post from '../models/Post.js'
import { POST_TYPE_COST, ENGAGEMENT_VALUES } from '../config/aiCosts.js'
import { companyOwnerId } from '../utils/companyWorkspace.js'

// One auto-managed campaign per user. Both its spend and revenue are derived
// entirely from the social calendar:
//   spend   = Σ cost of each posted item, by content type (text/image/video)
//   revenue = Σ engagement value across all posts (views/likes/shares/comments)
// It is created lazily the first time there is something to record.
export const AUTO_CAMPAIGN_NAME = 'AI usage & social'

export async function getOrCreateAutoCampaign() {
  let campaign = await Campaign.findOne({ auto: true })
  if (!campaign) {
    campaign = await Campaign.create({
      user: companyOwnerId(), name: AUTO_CAMPAIGN_NAME, platform: 'AI',
      auto: true, spend: 0, revenue: 0, status: 'active',
    })
  }
  return campaign
}

// Spend a single post contributes once it is posted, based on its content type.
export function postSpend(post) {
  return post.posted ? (POST_TYPE_COST[post.type] || 0) : 0
}

// Revenue a single post earns from its engagement counts.
export function engagementRevenue(post) {
  if (post.platform === 'YouTube' && post.type === 'Video' && post.rpm > 0) {
    return ((post.views || 0) / 1000) * post.rpm
  }

  if (post.type === 'Image' && post.impressions > 0 && post.averageOrderValue > 0) {
    const clickRate = post.clickRate > 1 ? post.clickRate / 100 : post.clickRate
    const conversionRate = post.conversionRate > 1 ? post.conversionRate / 100 : post.conversionRate
    return post.impressions * clickRate * conversionRate * post.averageOrderValue
  }

  return (
    (post.views    || 0) * ENGAGEMENT_VALUES.views +
    (post.likes    || 0) * ENGAGEMENT_VALUES.likes +
    (post.shares   || 0) * ENGAGEMENT_VALUES.shares +
    (post.comments || 0) * ENGAGEMENT_VALUES.comments
  )
}

// Recompute the auto campaign's spend + revenue from all the user's posts.
export async function recomputeAutoCampaign() {
  const posts = await Post.find({ deleted: { $ne: true } })
  const spend   = Math.round(posts.reduce((s, p) => s + postSpend(p), 0) * 100) / 100
  const revenue = Math.round(posts.reduce((s, p) => s + engagementRevenue(p), 0))

  const existing = await Campaign.findOne({ auto: true })
  if (!existing && spend === 0 && revenue === 0) return null

  await getOrCreateAutoCampaign()
  return Campaign.findOneAndUpdate(
    { auto: true },
    { $set: { spend, revenue } },
    { new: true }
  )
}
