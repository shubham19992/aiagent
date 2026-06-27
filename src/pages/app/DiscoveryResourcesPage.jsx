import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle, FiClock, FiServer } from 'react-icons/fi';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { SiGooglecloud } from 'react-icons/si';
import { PageHeader } from './_parts';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD_ICON = { aws: <FaAws />, azure: <VscAzure />, gcp: <SiGooglecloud /> };

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};
const prettyKey = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/** Detail page for a discovery category — lists each resource with its full
 *  set of properties. Reached by clicking a card on the discovery page; the
 *  resources are passed via nav state (no refetch). */
export default function DiscoveryResourcesPage() {
  const { opCode, envCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { title, resources, cloudProvider, executionTime } = location.state || {};
  const list = Array.isArray(resources) ? resources : [];
  const envName = ENV_NAME[envCode] || (envCode || '').toUpperCase();
  const discoveryPath = `/dashboard/observability/${opCode}/${envCode}/discovery`;
  const opPath = `/dashboard/observability/${opCode}`;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opCode, to: opPath },
          { label: envName, to: `/dashboard/observability/${opCode}/${envCode}` },
          { label: 'Discovery', to: discoveryPath },
          { label: 'Resources' },
        ]}
      />
      <main className="xd-main">
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>{title || 'Resources'}</h1>
            <p>
              {cloudProvider || ''}{cloudProvider ? ' · ' : ''}{list.length} resource{list.length === 1 ? '' : 's'}
              {executionTime ? <> · <FiClock className="xd-disc-inline-ico" /> {fmtDateTime(executionTime)}</> : null}
            </p>
          </div>
          <button type="button" className="xd-btn-ghost xd-btn-sm" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>
        </div>

        {!location.state ? (
          <div className="xd-empty">
            <FiAlertTriangle />
            <p>No resource data — open this page from a discovery card.</p>
            <Link to={discoveryPath} className="xd-btn xd-btn-sm">Go to Discovery</Link>
          </div>
        ) : list.length === 0 ? (
          <div className="xd-empty"><FiAlertTriangle /><p>No resources in this category.</p></div>
        ) : (
          <div className="xd-disc-res-grid">
            {list.map((r, i) => (
              <div className="xd-card xd-disc-res-card" key={r.id || i}>
                <div className="xd-disc-res-head">
                  <span className="xd-disc-res-ico">{CLOUD_ICON[envCode] || <FiServer />}</span>
                  <div className="xd-disc-res-titles">
                    <div className="xd-disc-res-name" title={r.name}>{r.name}</div>
                    {r.resourceType && <span className="xd-disc-res-type">{r.resourceType}</span>}
                  </div>
                </div>
                <div className="xd-disc-res-props">
                  {Object.entries(r.properties || {})
                    .filter(([, v]) => v !== '' && v != null)
                    .map(([k, v]) => (
                      <div className="xd-disc-res-prop" key={k}>
                        <span className="xd-disc-res-prop-k">{prettyKey(k)}</span>
                        <span className="xd-disc-res-prop-v" title={String(v)}>{String(v)}</span>
                      </div>
                    ))}
                </div>
                {r.id && <div className="xd-disc-res-id" title={r.id}>{r.id}</div>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
