import fetch from 'node-fetch'

export async function generateImage({ product, scene, style }) {
  const prompt = `Professional ${style.toLowerCase()} product photography of ${product}. 
Scene: ${scene}. Studio quality, commercial advertising, high resolution, 
sharp focus, beautiful lighting, D2C brand aesthetic.`

  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt,
      width: 1024,
      height: 768,
      steps: 4,
      n: 1,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Image generation failed')
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('No image URL returned')
  return url
}