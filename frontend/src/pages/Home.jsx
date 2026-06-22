import Button from '../components/Button'

const features = [
  {
    title: 'Campaign ROI dashboard',
    text: 'Track spend, revenue, active campaigns, platform split, and month-wise revenue trends from one place.',
  },
  {
    title: 'Social calendar',
    text: 'Plan content by date and time, upload media, schedule posts, retry failures, and keep posting history visible.',
  },
  {
    title: 'AI copy generator',
    text: 'Create captions, ad copy, product descriptions, custom formats, hashtags, and brand-tone specific text.',
  },
  {
    title: 'AI product images',
    text: 'Generate promotional product visuals with custom sizes, pixels, styles, and quality controls.',
  },
  {
    title: 'Video ad creator',
    text: 'Turn product images and briefs into video-ready ad assets with preview, play, pause, and download controls.',
  },
  {
    title: 'Auto social posting',
    text: 'Publish scheduled feed and story content to Instagram, Facebook, and LinkedIn using your connected accounts.',
  },
]

const workflow = [
  'Add your brand, product, prompt, or media.',
  'Generate copy, images, or videos with AI.',
  'Schedule the content in the social calendar.',
  'Auto-post on connected platforms at the selected time.',
  'Review campaign spend, revenue, and platform performance.',
]

export default function Home({ onLogin, onSignup }) {
  return (
    <div className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#top" aria-label="Marketo AI home">
          <img src="/favicon.svg" alt="" />
          <span>
            <strong>Marketo AI</strong>
            <small>D2C growth suite</small>
          </span>
        </a>

        <nav className="home-links" aria-label="Home navigation">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#platforms">Platforms</a>
          <a href="#access">Access</a>
        </nav>

        <div className="home-actions">
          <Button variant="ghost" size="sm" onClick={onLogin}>Log in</Button>
          <Button size="sm" onClick={onSignup}>Get started</Button>
        </div>
      </header>

      <main id="top" className="home-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <div className="home-eyebrow">AI marketing command center</div>
            <h1>Generate, schedule, post, and measure your brand content.</h1>
            <p>
              Marketo AI brings copy generation, product visuals, video ads, social scheduling,
              reminders, and ROI tracking into one workspace for D2C teams.
            </p>
            <div className="home-hero-actions">
              <Button onClick={onSignup}>Start with your account</Button>
              <Button variant="ghost" onClick={onLogin}>Open dashboard</Button>
            </div>
            <div className="home-proof">
              <span>Instagram</span>
              <span>Facebook</span>
              <span>LinkedIn</span>
              <span>Gemini AI</span>
            </div>
          </div>

          <div className="home-product-panel" aria-label="Project preview">
            <div className="home-panel-top">
              <span>Live workspace</span>
              <strong>Campaign ROI</strong>
            </div>
            <div className="home-metric-grid">
              <div>
                <small>Total spend</small>
                <strong>Rs 0</strong>
                <span>This month</span>
              </div>
              <div>
                <small>Total revenue</small>
                <strong>Rs 0</strong>
                <span>Auto calculated</span>
              </div>
              <div>
                <small>Active campaigns</small>
                <strong>0</strong>
                <span>Incl. posted content</span>
              </div>
            </div>
            <div className="home-preview-card">
              <div className="home-chart-bars">
                {[18, 24, 32, 44, 56, 78, 46, 64, 88, 52, 72, 40].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="home-preview-footer">
                <strong>Revenue trend</strong>
                <span>Year and month wise</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="home-section">
          <div className="home-section-head">
            <span>What is included</span>
            <h2>All tools in one project</h2>
          </div>
          <div className="home-feature-grid">
            {features.map(feature => (
              <article className="home-feature-card" key={feature.title}>
                <div className="home-feature-mark" />
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="home-section home-split">
          <div>
            <span className="home-kicker">How it works</span>
            <h2>From idea to published post</h2>
            <p>
              The app is built around a simple flow: create assets, schedule them,
              publish automatically, then measure what happened.
            </p>
          </div>
          <ol className="home-workflow">
            {workflow.map(item => <li key={item}>{item}</li>)}
          </ol>
        </section>

        <section id="platforms" className="home-section">
          <div className="home-section-head">
            <span>Connected channels</span>
            <h2>Focused on the platforms you use</h2>
          </div>
          <div className="home-platforms">
            {['Instagram feed and story', 'Facebook feed and story', 'LinkedIn feed'].map(platform => (
              <div key={platform}>{platform}</div>
            ))}
          </div>
        </section>

        <section id="access" className="home-cta">
          <div>
            <span className="home-kicker">After login</span>
            <h2>You can access every tool from the full dashboard.</h2>
            <p>
              Log in to see campaigns, social calendar, copy generator, AI images,
              video ads, notifications, settings, and connected posting tools.
            </p>
          </div>
          <Button onClick={onSignup}>Continue to Marketo AI</Button>
        </section>
      </main>
    </div>
  )
}
