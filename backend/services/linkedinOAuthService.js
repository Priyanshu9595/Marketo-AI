const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'

const pendingStates = new Map()
const STATE_TTL_MS = 10 * 60 * 1000

function clean(value = '') {
  return String(value).trim().replace(/^['"]|['"]$/g, '')
}

function getOAuthConfig() {
  const clientId = clean(process.env.LINKEDIN_CLIENT_ID)
  const clientSecret = clean(process.env.LINKEDIN_CLIENT_SECRET)
  const redirectUri = clean(process.env.LINKEDIN_REDIRECT_URI)
  const scope = clean(process.env.LINKEDIN_SCOPES) || 'openid profile w_member_social'

  if (!clientId || !clientSecret || !redirectUri) {
    const err = new Error('LinkedIn OAuth is not configured. Add LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI in backend/.env.')
    err.status = 400
    throw err
  }

  return { clientId, clientSecret, redirectUri, scope }
}

function createState() {
  const state = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  pendingStates.set(state, Date.now() + STATE_TTL_MS)
  return state
}

function verifyState(state) {
  const expiresAt = pendingStates.get(state)
  pendingStates.delete(state)
  return Boolean(expiresAt && expiresAt > Date.now())
}

export function getLinkedInAuthUrl() {
  const { clientId, redirectUri, scope } = getOAuthConfig()
  const state = createState()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope,
  })

  return {
    authUrl: `${AUTH_URL}?${params}`,
    redirectUri,
    scope,
  }
}

export async function exchangeLinkedInCode({ code, state }) {
  if (!code) {
    const err = new Error('LinkedIn callback is missing code.')
    err.status = 400
    throw err
  }

  if (state && !verifyState(state)) {
    const err = new Error('LinkedIn OAuth state is invalid or expired. Generate a new auth URL and try again.')
    err.status = 400
    throw err
  }

  const { clientId, clientSecret, redirectUri } = getOAuthConfig()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const tokenData = await tokenRes.json().catch(() => ({}))

  if (!tokenRes.ok) {
    const err = new Error(tokenData.error_description || tokenData.error || `LinkedIn token exchange failed (${tokenRes.status}).`)
    err.status = tokenRes.status
    throw err
  }

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const userInfo = await userRes.json().catch(() => ({}))
  const personId = userRes.ok ? userInfo.sub || '' : ''

  return {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in,
    scope: tokenData.scope,
    personId,
    authorUrn: personId ? `urn:li:person:${personId}` : '',
    userInfo: {
      name: userInfo.name,
      email: userInfo.email,
    },
  }
}
