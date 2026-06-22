/**
 * Convert a fresh short-lived Meta user token into a never-expiring Page token
 * and resolve the linked Instagram Business account id.
 *
 * 1. Get a SHORT-LIVED user token from the Graph API Explorer with permissions:
 *      pages_show_list, pages_read_engagement, pages_manage_posts,
 *      business_management, instagram_basic, instagram_content_publish
 * 2. Run (App ID + App Secret are in Meta dashboard → Settings → Basic):
 *
 *      node scripts/getMetaTokens.js \
 *        --app-id=APP_ID --app-secret=APP_SECRET --token=SHORT_LIVED_TOKEN
 *
 *    Optionally pin a page with --page-id=PAGE_ID.
 *
 * It prints the FACEBOOK_* and INSTAGRAM_* lines to paste into backend/.env.
 */
import fetch from 'node-fetch'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v23.0'
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

// Read --key=value flags, falling back to env vars.
function arg(name, envName) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : (envName ? process.env[envName] : undefined)
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${BASE}/${path}?${qs}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Graph error ${res.status} on ${path}`)
  return data
}

async function main() {
  const appId     = arg('app-id', 'FACEBOOK_APP_ID')
  const appSecret = arg('app-secret', 'FACEBOOK_APP_SECRET')
  const shortTok  = arg('token')
  const wantPage  = arg('page-id', 'FACEBOOK_PAGE_ID')

  if (!appId || !appSecret || !shortTok) {
    console.error('Missing input.\nUsage: node scripts/getMetaTokens.js --app-id=… --app-secret=… --token=SHORT_LIVED_TOKEN [--page-id=…]')
    process.exit(1)
  }

  // 1. Short-lived user token → long-lived user token (~60 days)
  console.log('→ Exchanging for a long-lived user token…')
  const longLived = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortTok,
  })
  const userToken = longLived.access_token
  if (!userToken) throw new Error('No long-lived user token returned.')

  // 2. List the pages this user manages — each carries a non-expiring Page token
  console.log('→ Fetching your Pages and their access tokens…')
  const accounts = await graphGet('me/accounts', { fields: 'id,name,access_token', access_token: userToken })
  const pages = accounts.data || []
  if (!pages.length) throw new Error('No Pages found for this user. Make sure you granted pages_show_list and admin the Page.')

  const page = wantPage ? pages.find(p => p.id === wantPage) : pages[0]
  if (!page) throw new Error(`Page ${wantPage} not found among: ${pages.map(p => `${p.name} (${p.id})`).join(', ')}`)

  // 3. Confirm the Page token never expires
  let expiresLabel = 'unknown'
  try {
    const dbg = await graphGet('debug_token', {
      input_token: page.access_token,
      access_token: `${appId}|${appSecret}`,
    })
    const exp = dbg.data?.expires_at
    expiresLabel = exp === 0 || exp === undefined ? 'NEVER ✅' : new Date(exp * 1000).toISOString()
  } catch { /* debug is best-effort */ }

  // 4. Resolve the linked Instagram Business account id
  let igId = ''
  try {
    const ig = await graphGet(page.id, { fields: 'instagram_business_account', access_token: page.access_token })
    igId = ig.instagram_business_account?.id || ''
  } catch { /* page may have no IG linked */ }

  console.log('\n──────── RESULT ────────')
  console.log(`Page:           ${page.name} (${page.id})`)
  console.log(`Page token TTL: ${expiresLabel}`)
  console.log(`IG account id:  ${igId || 'none linked — link an IG Business account to this Page'}`)
  if (pages.length > 1) {
    console.log(`\nOther pages: ${pages.filter(p => p.id !== page.id).map(p => `${p.name} (${p.id})`).join(', ')}`)
    console.log('Re-run with --page-id=… to pick a different one.')
  }

  console.log('\n──────── paste into backend/.env ────────')
  console.log(`FACEBOOK_PAGE_ID=${page.id}`)
  console.log(`FACEBOOK_PAGE_ACCESS_TOKEN=${page.access_token}`)
  console.log(`INSTAGRAM_ACCESS_TOKEN=${page.access_token}`)
  console.log(`INSTAGRAM_IG_USER_ID=${igId}`)
  console.log('─────────────────────────────────────────')
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1) })
