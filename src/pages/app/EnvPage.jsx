import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import {
  FiDollarSign, FiWifi, FiCpu, FiDatabase, FiShield, FiActivity, FiLink, FiArrowRight,
} from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listMeasures } from '../../api/observability';

const MEASURE_ICON = {
  cost: <FiDollarSign />,
  network: <FiWifi />,
  compute: <FiCpu />,
  storage: <FiDatabase />,
  security: <FiShield />,
};
const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

/** Env drill-down: measures for an op + env, with a Connect action that
 *  opens the connection-parameters page. */
export default function EnvPage() {
  const { opCode, envCode } = useParams();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const [measures, setMeasures] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listMeasures(opCode, envCode).then((m) => {
      if (!alive) return;
      setMeasures(m.items);
      setSource(m.source === 'dummy' ? 'dummy' : 'api');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [opCode, envCode]);

  const envName = ENV_NAME[envCode] || envCode.toUpperCase();
  const opName = op?.name || opCode;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opName, to: `/dashboard/observability/${opCode}` },
          { label: envName },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>{opName} · {envName}</h1>
          <p>Measures available for this environment. Connect your credentials to start collecting data.</p>
        </div>

        {loading ? (
          <Spinner label="Loading environment…" />
        ) : (
          <>
            {/* Measures */}
            <h3 className="xd-subhead">Measures</h3>
            <div className="xd-measure-grid">
              {measures.map((m) => (
                <div className="xd-measure-card" key={m.code}>
                  <span className="xd-measure-icon">{MEASURE_ICON[m.code] || <FiActivity />}</span>
                  <div>
                    <div className="xd-measure-name">{m.name}</div>
                    <div className="xd-measure-desc">{m.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Connection — moved to its own page, reached via this button */}
            <h3 className="xd-subhead">Connection</h3>
            <div className="xd-card xd-connect-cta">
              <span className="xd-connect-cta-icon"><FiLink /></span>
              <div className="xd-connect-cta-text">
                <div className="xd-connect-cta-title">Connect {envName}</div>
                <p>Provide the connection parameters to link {opName} on {envName} and start collecting measures.</p>
              </div>
              <Link
                to={`/dashboard/observability/${opCode}/${envCode}/connect`}
                className="xd-btn xd-connect-cta-btn"
              >
                Connect <FiArrowRight />
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
