import React from 'react';
import { useNavigate } from 'react-router-dom';
import { VscAzure } from 'react-icons/vsc';
import { FaAws } from 'react-icons/fa';
import { SiGooglecloud, SiKubernetes, SiDigitalocean } from 'react-icons/si';
import { FiArrowRight } from 'react-icons/fi';
import '../assets/css/CloudSelect.css';
import XopsLogo from '../components/XopsLogo';

/**
 * Public landing screen shown BEFORE login. The user picks a cloud
 * platform; clicking an active provider stores the choice and routes
 * to the login page. After login they see that cloud's dashboard.
 *
 * Only Azure is wired up for now (we have its metrics); the rest are
 * presented as "Coming soon".
 */
const CLOUDS = [
  {
    id: 'azure',
    name: 'Microsoft Azure',
    desc: 'Monitor Azure resources & ARM API health',
    icon: <VscAzure />,
    color: '#0089D6',
    active: true,
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    desc: 'CloudWatch metrics & service health',
    icon: <FaAws />,
    color: '#FF9900',
    active: false,
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    desc: 'GCP monitoring & operations suite',
    icon: <SiGooglecloud />,
    color: '#4285F4',
    active: false,
  },
  {
    id: 'k8s',
    name: 'Kubernetes',
    desc: 'Cluster & workload observability',
    icon: <SiKubernetes />,
    color: '#326CE5',
    active: false,
  },
  {
    id: 'do',
    name: 'DigitalOcean',
    desc: 'Droplet & app platform metrics',
    icon: <SiDigitalocean />,
    color: '#0080FF',
    active: false,
  },
];

export default function CloudSelect() {
  const navigate = useNavigate();

  const choose = (cloud) => {
    if (!cloud.active) return;
    sessionStorage.setItem('xops_cloud', cloud.id);
    sessionStorage.setItem('xops_cloud_name', cloud.name);
    navigate('/login');
  };

  return (
    <div className="cs-page">
      <header className="cs-header">
        <XopsLogo height={40} />
      </header>

      <main className="cs-main">
        <div className="cs-intro">
          <h1>Choose your cloud platform</h1>
          <p>Select a provider to sign in and view its monitoring dashboard.</p>
        </div>

        <div className="cs-grid">
          {CLOUDS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cs-card ${c.active ? 'active' : 'disabled'}`}
              onClick={() => choose(c)}
              disabled={!c.active}
              aria-label={`${c.name}${c.active ? '' : ' (coming soon)'}`}
            >
              <span className="cs-badge">
                {c.active ? <span className="cs-badge-live">● Available</span>
                          : <span className="cs-badge-soon">Coming soon</span>}
              </span>
              <span className="cs-icon" style={{ color: c.color, '--cs-glow': `${c.color}22` }}>
                {c.icon}
              </span>
              <span className="cs-name">{c.name}</span>
              <span className="cs-desc">{c.desc}</span>
              {c.active && (
                <span className="cs-cta">
                  Continue <FiArrowRight />
                </span>
              )}
            </button>
          ))}
        </div>
      </main>

      <footer className="cs-footer">© 2026 xOps · Multi-Cloud Automation Tool · Internal Use Only</footer>
    </div>
  );
}
