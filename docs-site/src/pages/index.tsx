import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="User and administrator documentation.">
      <header
        className="docs-home-hero"
        style={{
          padding: '4rem 1rem 3rem',
          textAlign: 'center',
          background: 'var(--ifm-color-primary)',
          color: 'white',
        }}>
        <div style={{maxWidth: 880, margin: '0 auto'}}>
          <Heading
            as="h1"
            className="docs-home-hero-title"
            style={{fontSize: '2.75rem', marginBottom: '0.5rem'}}>
            {siteConfig.title}
          </Heading>
          <p
            className="docs-home-hero-tagline"
            style={{fontSize: '1.15rem', opacity: 0.9, marginBottom: '2rem'}}>
            Documentation
          </p>
          <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link
              className="button button--secondary button--lg"
              to="/user/getting-started">
              User Guide
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/admin/setup-wizard">
              Admin Guide
            </Link>
            <Link
              className="button button--outline button--lg"
              style={{color: 'white', borderColor: 'white'}}
              to="/comparison">
              Shane Comparison
            </Link>
          </div>
        </div>
      </header>
      <main style={{padding: '3rem 1rem', maxWidth: 880, margin: '0 auto'}}>
        <section style={{display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'}}>
          <div style={{padding: '1.5rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8}}>
            <h3>For Users</h3>
            <p>How to use the dashboard, create purchase orders, receive inventory, scan asset tags, and chat with the AI assistant.</p>
            <Link to="/user/getting-started">Read the User Guide →</Link>
          </div>
          <div style={{padding: '1.5rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8}}>
            <h3>For Administrators</h3>
            <p>Setup wizard, Docker deployment, every settings page in detail, runtime migrations, and architecture.</p>
            <Link to="/admin/setup-wizard">Read the Admin Guide →</Link>
          </div>
          <div style={{padding: '1.5rem', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8}}>
            <h3>Why Pro-Code Won</h3>
            <p>A side-by-side comparison against Shane Young&apos;s Power Platform demo, with the business case for AI-assisted pro-code.</p>
            <Link to="/comparison">Read the Comparison →</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
