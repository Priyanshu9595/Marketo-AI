export const C = {
  bg:          'var(--bg)',
  surface:     'var(--surface)',
  surfaceAlt:  'var(--surface-alt)',
  border:      'var(--border)',
  borderHover: 'var(--border-hover)',
  accent:      'var(--accent)',
  accentMid:   'var(--accent-mid)',
  accentSoft:  'var(--accent-soft)',
  green:       'var(--green)',
  greenSoft:   'var(--green-soft)',
  amber:       'var(--amber)',
  amberSoft:   'var(--amber-soft)',
  red:         'var(--red)',
  redSoft:     'var(--red-soft)',
  text:        'var(--text)',
  textMuted:   'var(--text-muted)',
  textDim:     'var(--text-dim)',
}

export const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Campaigns',      icon: 'dashboard' },
  { id: 'calendar',   label: 'Social calendar', icon: 'calendar'  },
  { id: 'copy',       label: 'Copy generator',  icon: 'pen'       },
  { id: 'image',      label: 'AI images',       icon: 'image'     },
  { id: 'video',      label: 'Video ads',       icon: 'video'     },
  { id: 'settings',   label: 'Settings',        icon: 'settings'  },
]

export const PLATFORM_COLORS = {
  Instagram: '#6C63FF',
  Facebook:  '#1877F2',
  LinkedIn:  '#0A66C2',
  X:         '#F0F0F8',
  YouTube:   '#FF0000',
  Pinterest: '#E60023',
}

export const COPY_TYPES = [
  'Instagram caption',
  'Ad copy',
  'Product description',
  'Email subject lines',
  'Blog intro',
  'Hashtags',
]

export const TONE_OPTIONS = [
  'Playful', 'Luxury', 'Minimal', 'Bold', 'Warm', 'Professional',
]

export const PLATFORMS = [
  'Instagram', 'Facebook', 'LinkedIn', 'X', 'Pinterest', 'YouTube',
]

export const AD_FORMATS = [
  { name: '15s Reel',   emoji: '📱', platforms: 'Instagram, TikTok', ratio: '9:16' },
  { name: '30s Ad',     emoji: '📺', platforms: 'Meta, YouTube',     ratio: '16:9' },
  { name: 'Story',      emoji: '🔲', platforms: 'Instagram, FB',     ratio: '9:16' },
  { name: 'Slideshow',  emoji: '🎞️', platforms: 'All platforms',     ratio: '1:1'  },
]

export const IMAGE_SCENES = {
  'Beach photoshoot': { emoji: '🏖️', desc: 'Golden hour, ocean blur, warm sand', seed: 'beach'  },
  'Gym setup':        { emoji: '💪', desc: 'Dramatic lighting, athletic aesthetic', seed: 'gym'   },
  'Luxury studio':    { emoji: '✨', desc: 'Clean white studio, pro lighting',     seed: 'studio' },
  'Festival vibes':   { emoji: '🎉', desc: 'Colorful bokeh, festive warm lights',  seed: 'party'  },
  'Forest trail':     { emoji: '🌲', desc: 'Dappled sunlight, natural greenery',   seed: 'forest' },
  'Urban street':     { emoji: '🏙️', desc: 'City backdrop, contemporary mood',    seed: 'city'   },
}