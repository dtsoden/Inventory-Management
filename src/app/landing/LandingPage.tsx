'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';
import {
  LayoutDashboard,
  ShoppingCart,
  ScanLine,
  Boxes,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Package,
  Check,
} from 'lucide-react';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-display',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

interface LandingProps {
  appName: string;
  primaryColor: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Live inventory visibility',
    body:
      'Stock levels, low-stock warnings, open orders, and recent activity the moment you sign in. No report to run, no spreadsheet to reconcile.',
  },
  {
    icon: ShoppingCart,
    title: 'Purchasing that moves',
    body:
      'Build purchase orders, route them for approval, and send clean PDFs to your vendors. Everyone sees the same status, so nothing gets ordered twice.',
  },
  {
    icon: ScanLine,
    title: 'Receiving in minutes',
    body:
      'Snap a photo of the packing slip. The assistant reads it, matches it to the order, and flags anything short or over. Scan asset tags with the phone already in your pocket.',
  },
  {
    icon: Boxes,
    title: 'Every asset accounted for',
    body:
      'Each unit gets a barcode and a full history: received, assigned, in maintenance, retired. You always know who has what and where it lives.',
  },
  {
    icon: Sparkles,
    title: 'Answers in plain English',
    body:
      'Ask what is running low, or what you bought from a vendor last quarter, and get a straight answer. No query to write, no analyst to wait on.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-ready by default',
    body:
      'Role-based access, encrypted credentials, and a log of every action. When someone asks who changed what, you show them in seconds.',
  },
];

const PROBLEMS = [
  'Money sitting on shelves because nobody remembered you already bought it.',
  'Work that stalls the moment something runs out, then costs more to expedite.',
  'Equipment that walks off with no record of who had it last.',
  'An afternoon lost to keying in a packing slip, and a typo that throws off the count anyway.',
  'A simple question from finance or an auditor that nobody in the room can answer.',
];

const OUTCOMES = [
  'Stop paying to store stock you already own.',
  'Stop scrambling when a critical part runs out.',
  'Cut receiving from a half-day chore to a few minutes.',
  'Walk into any audit with the answer already in hand.',
];

export default function LandingPage({
  appName,
  primaryColor,
  logoUrlLight,
  logoUrlDark,
}: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  const logo = logoUrlDark || logoUrlLight;
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`${display.variable} ${mono.variable} landing-root`}
      style={{ '--brand': primaryColor } as React.CSSProperties}
    >
      <style>{LANDING_CSS}</style>

      {/* ---------- Nav ---------- */}
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-shell landing-nav-inner">
          <div className="landing-brand">
            {logo ? (
              <img src={logo} alt={appName} className="landing-logo" />
            ) : (
              <span className="landing-mark">
                <Package size={18} strokeWidth={2.4} />
              </span>
            )}
            <span className="landing-brand-name">{appName}</span>
          </div>
          <Link href="/login" className="landing-btn landing-btn-primary landing-btn-sm">
            Sign in
            <ArrowRight size={16} strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="landing-hero">
          <div className="landing-glow" aria-hidden="true" />
          <div className="landing-shell landing-hero-inner">
            <p className="landing-eyebrow reveal" style={{ animationDelay: '0ms' }}>
              <span className="landing-dot" /> Enterprise inventory operations
            </p>
            <h1 className="landing-h1 reveal" style={{ animationDelay: '80ms' }}>
              Know what you own, where it sits,
              <br className="landing-br" /> and what it{' '}
              <span className="landing-accent">costs you</span>.
            </h1>
            <p className="landing-lead reveal" style={{ animationDelay: '160ms' }}>
              {`Most teams run on spreadsheets, sticky notes, and memory. That is how stock goes missing, orders get placed twice, and month-end turns into a guessing game. ${appName} puts your whole operation in one place, from the first purchase order to the day an asset is retired.`}
            </p>
            <div className="landing-cta-row reveal" style={{ animationDelay: '240ms' }}>
              <Link href="/login" className="landing-btn landing-btn-primary">
                Sign in
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
              <a href="#features" className="landing-btn landing-btn-ghost">
                See how it works
              </a>
            </div>
            <div className="landing-stat-strip reveal" style={{ animationDelay: '320ms' }}>
              <div className="landing-stat">
                <span className="landing-stat-k">One</span>
                <span className="landing-stat-v">source of truth</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-k">Minutes</span>
                <span className="landing-stat-v">to receive an order</span>
              </div>
              <div className="landing-stat">
                <span className="landing-stat-k">Every</span>
                <span className="landing-stat-v">action logged</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Problem ---------- */}
        <section className="landing-section">
          <div className="landing-shell">
            <p className="landing-kicker">The problem</p>
            <h2 className="landing-h2">What not knowing actually costs</h2>
            <p className="landing-section-lead">
              {`The bill for blurry inventory does not show up on one line. It hides in a dozen places, and it adds up fast.`}
            </p>
            <ul className="landing-problem-list">
              {PROBLEMS.map((p) => (
                <li key={p} className="landing-problem">
                  <span className="landing-problem-bar" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="landing-section landing-section-alt" id="features">
          <div className="landing-shell">
            <p className="landing-kicker">What it does</p>
            <h2 className="landing-h2">One system for the whole inventory lifecycle</h2>
            <p className="landing-section-lead">
              {`From buying to receiving to retiring an asset, the work happens in the same place, with the same numbers everyone trusts.`}
            </p>
            <div className="landing-grid">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <article key={f.title} className="landing-card">
                    <span className="landing-card-icon">
                      <Icon size={22} strokeWidth={2} />
                    </span>
                    <h3 className="landing-card-title">{f.title}</h3>
                    <p className="landing-card-body">{f.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Outcomes ---------- */}
        <section className="landing-section">
          <div className="landing-shell landing-outcomes">
            <div className="landing-outcomes-head">
              <p className="landing-kicker">Why it pays off</p>
              <h2 className="landing-h2">Run leaner without working harder</h2>
              <p className="landing-section-lead">
                {`Better visibility is not a nice-to-have. It is the difference between guessing and knowing, and knowing is cheaper.`}
              </p>
            </div>
            <ul className="landing-outcome-list">
              {OUTCOMES.map((o) => (
                <li key={o} className="landing-outcome">
                  <span className="landing-check">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- Enterprise band ---------- */}
        <section className="landing-section landing-section-alt">
          <div className="landing-shell">
            <p className="landing-kicker">Built for serious operations</p>
            <h2 className="landing-h2">Ready for the way large organizations work</h2>
            <div className="landing-trust">
              <div className="landing-trust-item">
                <h4>Your brand, not ours</h4>
                <p>{`Drop in your name, logo, and colors. The platform wears your identity end to end.`}</p>
              </div>
              <div className="landing-trust-item">
                <h4>Locked-down access</h4>
                <p>{`Role-based permissions decide who can buy, approve, receive, and administer.`}</p>
              </div>
              <div className="landing-trust-item">
                <h4>Separation between teams</h4>
                <p>{`Multi-tenant isolation keeps each organization's data walled off from the rest.`}</p>
              </div>
              <div className="landing-trust-item">
                <h4>Secrets stay secret</h4>
                <p>{`Sensitive credentials are encrypted at rest, so a database copy is not a breach.`}</p>
              </div>
              <div className="landing-trust-item">
                <h4>A record of everything</h4>
                <p>{`A complete audit log captures who did what and when, ready for review.`}</p>
              </div>
              <div className="landing-trust-item">
                <h4>Runs where you do</h4>
                <p>{`Ships as a single container you host alongside the rest of your systems.`}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="landing-final">
          <div className="landing-glow landing-glow-bottom" aria-hidden="true" />
          <div className="landing-shell landing-final-inner">
            <h2 className="landing-final-title">
              Ready to see exactly what you have?
            </h2>
            <p className="landing-final-lead">
              {`Sign in and take control of your inventory today.`}
            </p>
            <Link href="/login" className="landing-btn landing-btn-primary landing-btn-lg">
              Sign in
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <div className="landing-brand">
            {logo ? (
              <img src={logo} alt={appName} className="landing-logo landing-logo-sm" />
            ) : (
              <span className="landing-mark landing-mark-sm">
                <Package size={15} strokeWidth={2.4} />
              </span>
            )}
            <span className="landing-footer-name">{appName}</span>
          </div>
          <span className="landing-footer-meta">
            {`Inventory operations platform`} &middot; &copy; {year}
          </span>
        </div>
      </footer>
    </div>
  );
}

const LANDING_CSS = `
.landing-root {
  --bg: #07090a;
  --panel: #0e1213;
  --panel-2: #11161780;
  --line: #1d2426;
  --ink: #eef2ee;
  --muted: #8b948e;
  --brand-soft: color-mix(in srgb, var(--brand) 16%, transparent);
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans), system-ui, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
.landing-root ::selection { background: var(--brand); color: #07090a; }
.landing-shell { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 24px; }

/* Nav */
.landing-nav {
  position: sticky; top: 0; z-index: 40;
  padding: 18px 0;
  transition: background .3s ease, border-color .3s ease, padding .3s ease;
  border-bottom: 1px solid transparent;
}
.landing-nav.is-scrolled {
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
}
.landing-nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.landing-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
.landing-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--brand); color: #07090a; flex-shrink: 0;
}
.landing-mark-sm { width: 28px; height: 28px; border-radius: 8px; }
.landing-logo { height: 34px; max-width: 190px; object-fit: contain; }
.landing-logo-sm { height: 26px; }
.landing-brand-name {
  font-family: var(--font-display), sans-serif;
  font-weight: 700; font-size: 1.06rem; letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Buttons */
.landing-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 0.95rem; line-height: 1;
  padding: 13px 22px; border-radius: 999px;
  cursor: pointer; text-decoration: none; border: 1px solid transparent;
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.landing-btn-sm { padding: 9px 17px; font-size: 0.88rem; }
.landing-btn-lg { padding: 16px 30px; font-size: 1.02rem; }
.landing-btn-primary {
  background: var(--brand); color: #07090a;
  box-shadow: 0 0 0 0 var(--brand-soft);
}
.landing-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 34px -10px var(--brand);
}
.landing-btn-ghost {
  background: transparent; color: var(--ink); border-color: var(--line);
}
.landing-btn-ghost:hover { border-color: var(--brand); color: var(--brand); transform: translateY(-2px); }

/* Hero */
.landing-hero { position: relative; padding: 88px 0 84px; }
.landing-glow {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(620px 420px at 18% -8%, var(--brand-soft), transparent 70%),
    radial-gradient(560px 420px at 92% 8%, color-mix(in srgb, var(--brand) 9%, transparent), transparent 72%);
}
.landing-glow-bottom {
  background: radial-gradient(640px 360px at 50% 120%, var(--brand-soft), transparent 72%);
}
.landing-hero-inner { position: relative; z-index: 1; max-width: 880px; }
.landing-eyebrow {
  font-family: var(--font-mono), monospace;
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 0.74rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--line); border-radius: 999px;
  padding: 7px 15px; margin-bottom: 28px;
}
.landing-dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--brand);
  box-shadow: 0 0 12px 1px var(--brand);
  animation: landing-pulse 2.4s ease-in-out infinite;
}
@keyframes landing-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
.landing-h1 {
  font-family: var(--font-display), sans-serif;
  font-weight: 800; letter-spacing: -0.03em; line-height: 1.02;
  font-size: clamp(2.5rem, 6.2vw, 4.55rem);
  margin: 0 0 24px;
}
.landing-accent {
  color: var(--brand);
  text-shadow: 0 0 38px var(--brand-soft);
}
.landing-lead {
  font-size: clamp(1.05rem, 1.6vw, 1.28rem);
  line-height: 1.62; color: var(--muted); max-width: 660px; margin: 0 0 34px;
}
.landing-cta-row { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 56px; }
.landing-stat-strip {
  display: flex; flex-wrap: wrap; gap: 14px 40px;
  border-top: 1px solid var(--line); padding-top: 30px;
}
.landing-stat { display: flex; flex-direction: column; gap: 4px; }
.landing-stat-k {
  font-family: var(--font-display), sans-serif;
  font-size: 1.7rem; font-weight: 700; color: var(--ink); line-height: 1;
}
.landing-stat-v {
  font-family: var(--font-mono), monospace;
  font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}

/* Generic section */
.landing-section { padding: 84px 0; position: relative; }
.landing-section-alt { background: var(--panel); border-block: 1px solid var(--line); }
.landing-kicker {
  font-family: var(--font-mono), monospace;
  font-size: 0.74rem; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--brand); margin: 0 0 14px;
}
.landing-h2 {
  font-family: var(--font-display), sans-serif;
  font-weight: 700; letter-spacing: -0.02em; line-height: 1.08;
  font-size: clamp(1.85rem, 3.6vw, 2.85rem); margin: 0 0 18px; max-width: 760px;
}
.landing-section-lead {
  font-size: 1.1rem; line-height: 1.6; color: var(--muted); max-width: 640px; margin: 0 0 44px;
}

/* Problem list */
.landing-problem-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; max-width: 820px; }
.landing-problem {
  display: flex; align-items: flex-start; gap: 16px;
  font-size: 1.08rem; line-height: 1.5; color: #cdd4ce;
  padding: 18px 22px; border: 1px solid var(--line); border-radius: 14px;
  background: var(--panel-2); transition: border-color .2s ease, transform .2s ease;
}
.landing-problem:hover { border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); transform: translateX(4px); }
.landing-problem-bar {
  flex-shrink: 0; width: 3px; align-self: stretch; min-height: 22px;
  background: var(--brand); border-radius: 2px; opacity: .8;
}

/* Feature grid */
.landing-grid {
  display: grid; gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
}
.landing-card {
  border: 1px solid var(--line); border-radius: 18px; padding: 28px;
  background: linear-gradient(180deg, var(--panel) 0%, color-mix(in srgb, var(--bg) 60%, var(--panel)) 100%);
  transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
}
.landing-card:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--brand) 55%, var(--line));
  box-shadow: 0 20px 50px -28px var(--brand);
}
.landing-card-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 12px; margin-bottom: 18px;
  background: var(--brand-soft); color: var(--brand);
  border: 1px solid color-mix(in srgb, var(--brand) 30%, transparent);
}
.landing-card-title {
  font-family: var(--font-display), sans-serif;
  font-size: 1.22rem; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 10px;
}
.landing-card-body { font-size: 0.98rem; line-height: 1.58; color: var(--muted); margin: 0; }

/* Outcomes */
.landing-outcomes { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.landing-outcomes-head .landing-section-lead { margin-bottom: 0; }
.landing-outcome-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
.landing-outcome {
  display: flex; align-items: flex-start; gap: 14px;
  font-size: 1.12rem; line-height: 1.45; font-weight: 500; color: var(--ink);
}
.landing-check {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px; margin-top: 1px;
  background: var(--brand); color: #07090a;
}

/* Trust */
.landing-trust {
  display: grid; gap: 1px; margin-top: 8px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  background: var(--line); border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
}
.landing-trust-item { background: var(--bg); padding: 28px; }
.landing-trust-item h4 {
  font-family: var(--font-display), sans-serif;
  font-size: 1.08rem; font-weight: 700; margin: 0 0 8px;
}
.landing-trust-item p { font-size: 0.95rem; line-height: 1.55; color: var(--muted); margin: 0; }

/* Final CTA */
.landing-final { position: relative; padding: 104px 0; text-align: center; overflow: hidden; }
.landing-final-inner { position: relative; z-index: 1; }
.landing-final-title {
  font-family: var(--font-display), sans-serif;
  font-weight: 800; letter-spacing: -0.025em; line-height: 1.05;
  font-size: clamp(2rem, 4.6vw, 3.4rem); margin: 0 0 16px;
}
.landing-final-lead { font-size: 1.18rem; color: var(--muted); margin: 0 0 34px; }

/* Footer */
.landing-footer { border-top: 1px solid var(--line); padding: 30px 0; }
.landing-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.landing-footer-name { font-family: var(--font-display), sans-serif; font-weight: 600; font-size: 0.95rem; }
.landing-footer-meta { font-family: var(--font-mono), monospace; font-size: 0.74rem; letter-spacing: 0.06em; color: var(--muted); }

/* Reveal animation */
.reveal { opacity: 0; transform: translateY(16px); animation: landing-reveal .7s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes landing-reveal { to { opacity: 1; transform: translateY(0); } }

@media (max-width: 860px) {
  .landing-outcomes { grid-template-columns: 1fr; gap: 32px; }
  .landing-br { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
  .landing-dot { animation: none; }
}
`;
