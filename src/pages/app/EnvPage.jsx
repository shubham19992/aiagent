import React, { useEffect, useState } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import {
  FiDollarSign, FiWifi, FiCpu, FiDatabase, FiShield, FiActivity, FiLink, FiArrowRight, FiTrash2,
} from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listMeasures } from '../../api/observability';
import { listConnections, removeConnection } from '../../store/connectionsStore';

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

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
  const [conns, setConns] = useState([]);
  const [connVersion, setConnVersion] = useState(0);

  // Connections created on the Create Connect page (re-reads after delete).
  useEffect(() => {
    setConns(listConnections(opCode, envCode));
  }, [opCode, envCode, connVersion]);

  const delConn = (id) => {
    removeConnection(opCode, envCode, id);
    setConnVersion((v) => v + 1);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listMeasures(opCode, envCode).then((m) => {
      if (!alive) return;
      setMeasures(m.items);
      setSource('api');
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setMeasures([]);
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
                Create Connect <FiArrowRight />
              </Link>
            </div>

            {/* Connections created via Create Connect */}
            {conns.length > 0 && (
              <>
                <h3 className="xd-subhead">Connections</h3>
                <div className="xd-card xd-conn-table-card">
                  <table className="xd-conn-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Parameters</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {conns.map((c) => (
                        <tr key={c.id}>
                          <td className="xd-conn-cell-name">{c.name}</td>
                          <td>
                            <div className="xd-conn-params">
                              {(c.fields || []).map((f, i) => (
                                <span className="xd-tag" key={i}>
                                  {f.label}: {f.secret ? '••••••' : (f.value || '—')}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td><span className="xd-status xd-status-active">{c.status || 'Connected'}</span></td>
                          <td className="xd-conn-cell-date">{fmtDateTime(c.createdAt)}</td>
                          <td>
                            <button type="button" className="xd-proj-del" title="Delete connection" onClick={() => delConn(c.id)}>
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
