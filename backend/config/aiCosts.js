// Per-generation paid-API cost in INR. Each successful AI generation adds this
// to the logged-in user's auto-tracked "AI usage & social" campaign spend.
//   text  → Gemini 2.5 Flash  $0.0028 ≈ ₹0.26
//   image → gemini-3.1-flash-image $0.039  ≈ ₹3.68
//   video → veo-3.0-generate-001 $0.80   ≈ ₹75.46
export const AI_COSTS = {
  copy:  0.26,
  image: 3.68,
  video: 75.46,
}

// Cost charged to spend each time a post of this content type is posted on the
// social calendar. Keys match the calendar's content types.
export const POST_TYPE_COST = {
  'Text message': AI_COSTS.copy,
  'Image':        AI_COSTS.image,
  'Video':        AI_COSTS.video,
}

// ₹ value assigned to each social engagement signal. Revenue on the auto
// campaign = Σ over the user's posts of (count × value).
export const ENGAGEMENT_VALUES = {
  views:    0.4,
  likes:    1,
  shares:   2,
  comments: 1.5,
}
