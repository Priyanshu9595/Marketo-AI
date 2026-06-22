import { exchangeLinkedInCode, getLinkedInAuthUrl } from '../services/linkedinOAuthService.js'
import fs from 'fs/promises'
import path from 'path'

const ENV_PATH = path.resolve(process.cwd(), '.env')

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function upsertEnv(values) {
  let text = ''
  try {
    text = await fs.readFile(ENV_PATH, 'utf8')
  } catch {
    text = ''
  }

  const lines = text.split(/\r?\n/)
  const byKey = new Map(lines.map((line, index) => {
    const match = line.match(/^([A-Z0-9_]+)\s*=/)
    return match ? [match[1], index] : [null, index]
  }).filter(([key]) => key))

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue
    const nextLine = `${key}=${value}`
    if (byKey.has(key)) {
      lines[byKey.get(key)] = nextLine
    } else {
      lines.push(nextLine)
    }
  }

  await fs.writeFile(ENV_PATH, lines.join('\n').replace(/\n{3,}/g, '\n\n'))
}

function tokenHtml(result, saved) {
  const envLines = [
    `LINKEDIN_ACCESS_TOKEN=${result.accessToken}`,
    result.personId ? `LINKEDIN_PERSON_ID=${result.personId}` : '',
    result.authorUrn ? `LINKEDIN_AUTHOR_URN=${result.authorUrn}` : '',
  ].filter(Boolean).join('\n')

  return `<!doctype html>
<html>
  <head>
    <title>LinkedIn connected</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
      pre { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; white-space: pre-wrap; word-break: break-all; }
      .note { color: #6b7280; }
    </style>
  </head>
  <body>
    <h2>LinkedIn connected</h2>
    <p>${saved ? 'Your backend/.env file was updated automatically.' : 'Copy these lines into <strong>backend/.env</strong>, then restart backend.'}</p>
    <pre>${escapeHtml(envLines)}</pre>
    <p class="note">Keep this token private. Restart backend before posting to LinkedIn.</p>
  </body>
</html>`
}

export function authUrl(req, res, next) {
  try {
    res.json(getLinkedInAuthUrl())
  } catch (err) { next(err) }
}

export function start(req, res, next) {
  try {
    res.redirect(getLinkedInAuthUrl().authUrl)
  } catch (err) { next(err) }
}

export async function callback(req, res, next) {
  try {
    const result = await exchangeLinkedInCode({
      code: req.query.code,
      state: req.query.state,
    })
    const envValues = {
      LINKEDIN_ACCESS_TOKEN: result.accessToken,
      LINKEDIN_PERSON_ID: result.personId,
      LINKEDIN_AUTHOR_URN: result.authorUrn,
    }
    let saved = false
    try {
      await upsertEnv(envValues)
      saved = true
    } catch {
      saved = false
    }

    const wantsJson = req.query.format === 'json' || req.get('accept')?.includes('application/json')
    if (wantsJson) {
      return res.json({
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        scope: result.scope,
        personId: result.personId,
        authorUrn: result.authorUrn,
        userInfo: result.userInfo,
        saved,
      })
    }

    res.type('html').send(tokenHtml(result, saved))
  } catch (err) { next(err) }
}

export async function exchange(req, res, next) {
  try {
    const result = await exchangeLinkedInCode({
      code: req.body.code,
      state: req.body.state,
    })
    await upsertEnv({
      LINKEDIN_ACCESS_TOKEN: result.accessToken,
      LINKEDIN_PERSON_ID: result.personId,
      LINKEDIN_AUTHOR_URN: result.authorUrn,
    })
    res.json({ ...result, saved: true })
  } catch (err) { next(err) }
}
