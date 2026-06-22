import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { VscAzure } from 'react-icons/vsc';
import { FaAws } from 'react-icons/fa';
import { SiGooglecloud } from 'react-icons/si';
import { FiServer, FiArrowRight } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listEnvs } from '../../api/observability';

const ENV_ICON = {
  aws: <FaAws />,
  azure: <VscAzure />,
  gcp: <SiGooglecloud />,
};
const ENV_COLOR = { aws: '#FF9900', azure: '#0089D6', gcp: '#4285F4' };

/** Op drill-down: shows the environments available for an op. */
export default function OpPage() {
  const { opCode } = useParams();
  const navigate = useNavigate();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const [envs, setEnvs] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listEnvs(opCode).then(({ items, source: src }) => {
      if (!alive) return;
      setEnvs(items);
      setSource(src);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setEnvs([]);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [opCode]);

  const title = op?.name || opCode;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Observability', to: '/dashboard' }, { label: title }]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>{title}</h1>
          <p>{op?.description || 'Choose an environment to view its measures and connection parameters.'}</p>
        </div>

        <h3 className="xd-subhead">Environments</h3>
        {loading ? (
          <Spinner label="Loading environments…" />
        ) : envs.length === 0 ? (
          <div className="xd-muted">No environments configured for this op.</div>
        ) : (
          <div className="xd-env-grid">
            {envs.map((env) => (
              <button
                key={env.code}
                type="button"
                className="xd-env-card"
                onClick={() => navigate(`/dashboard/observability/${opCode}/${env.code}`)}
              >
                <span className="xd-env-icon" style={{ color: ENV_COLOR[env.code] || 'var(--xd-emerald)' }}>
                  {ENV_ICON[env.code] || <FiServer />}
                </span>
                <span className="xd-env-name">{env.name}</span>
                <span className="xd-env-desc">{env.description}</span>
                <span className="xd-env-cta">Open <FiArrowRight /></span>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
