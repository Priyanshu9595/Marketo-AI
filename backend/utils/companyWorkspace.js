import mongoose from 'mongoose'

// All business data belongs to one company workspace, so every signed-in user
// sees the same campaigns, social calendar, and AI generation history.
export const COMPANY_WORKSPACE_USER_ID = new mongoose.Types.ObjectId(
  process.env.COMPANY_WORKSPACE_ID || '000000000000000000000001'
)

export const companyOwnerId = () => COMPANY_WORKSPACE_USER_ID
