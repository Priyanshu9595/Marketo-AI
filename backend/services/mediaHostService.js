import fs from 'fs/promises'
import path from 'path'

// Permanent, always-public media hosting. Posting to Facebook/Instagram needs a
// public HTTPS media URL — hosting media off-machine means it works from
// localhost with no dev tunnel and the URL never changes.
//
// Two backends:
//   • Cloudinary — used automatically if configured (most reliable). One-time,
//     no-terminal setup: create a free account at https://cloudinary.com, copy
//     your Cloud name, add an UNSIGNED upload preset, then in backend/.env:
//         CLOUDINARY_CLOUD_NAME=your_cloud_name
//         CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
//   • catbox.moe — zero-setup anonymous fallback (no account, no key). Used when
//     Cloudinary isn't configured, so posting works out of the box.
const CLOUD_NAME    = (process.env.CLOUDINARY_CLOUD_NAME || '').trim()
const UPLOAD_PRESET = (process.env.CLOUDINARY_UPLOAD_PRESET || '').trim()

export function cloudinaryConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET)
}

function isVideo(mimeType = '', filename = '') {
  return /^video\//i.test(mimeType) || /\.(mp4|mov)$/i.test(filename)
}

async function uploadToCloudinary(buffer, mimeType, filename) {
  const resourceType = isVideo(mimeType, filename) ? 'video' : 'image'
  const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: new URLSearchParams({ file: dataUri, upload_preset: UPLOAD_PRESET }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message || `Cloudinary upload failed (${res.status})`)
  }
  return json.secure_url
}

async function uploadToTmpfiles(buffer, mimeType, filename) {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), filename || 'upload')
  const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form })
  const json = await res.json().catch(() => ({}))
  
  if (!res.ok || json.status !== 'success' || !json.data?.url) {
    throw new Error(`Public upload failed: ${json.message || res.status}`)
  }
  
  // Convert viewing URL to direct download URL (tmpfiles.org/xxxx -> tmpfiles.org/dl/xxxx)
  return json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
}

// Upload a buffer to permanent public hosting. Prefers Cloudinary (if set up),
// falls back to the no-setup anonymous host so it always works.
export async function uploadBuffer(buffer, { mimeType = '', filename = '' } = {}) {
  if (cloudinaryConfigured()) {
    try { return await uploadToCloudinary(buffer, mimeType, filename) }
    catch { /* fall through to the anonymous host */ }
  }
  return uploadToTmpfiles(buffer, mimeType, filename)
}

export async function uploadBase64({ dataBase64, mimeType = '', filename = '' }) {
  const clean = dataBase64.startsWith('data:') ? dataBase64.split(',')[1] : dataBase64
  return uploadBuffer(Buffer.from(clean, 'base64'), { mimeType, filename })
}

// Re-host a media URL that points at our own machine (localhost / dev tunnel /
// our /generated assets) onto permanent public hosting. Public third-party URLs
// are returned unchanged. Returns the original URL if re-hosting fails.
export async function rehostLocalUrl(mediaUrl) {
  if (!mediaUrl) return mediaUrl

  const looksLocal = /\/generated\//.test(mediaUrl) ||
    /(localhost|127\.0\.0\.1|0\.0\.0\.0|devtunnels\.ms|ngrok)/i.test(mediaUrl)
  if (!looksLocal) return mediaUrl

  const match = mediaUrl.match(/\/generated\/(.+)$/)
  if (!match) return mediaUrl

  const relative = decodeURIComponent(match[1].split('?')[0])
  const filePath = path.resolve(process.cwd(), 'generated', relative)
  try {
    const buffer = await fs.readFile(filePath)
    return await uploadBuffer(buffer, { filename: path.basename(filePath) })
  } catch {
    return mediaUrl
  }
}
