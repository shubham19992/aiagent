import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { FiArrowRight, FiTrash2, FiEdit2 } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listEnvs } from '../../api/observability';
import { listCredentials, deleteCredential } from '../../api/credentials';

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

/** Op drill-down: shows the environments available for an op. */
export default function OpPage() {
  const { opCode } = useParams();
  const navigate = useNavigate();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const [envs, setEnvs] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [conns, setConns] = useState([]);
  const [connVersion, setConnVersion] = useState(0);

  // Credentials created via Create Connect, for this op (all its envs).
  useEffect(() => {
    let alive = true;
    listCredentials().then((items) => {
      if (!alive) return;
      setConns(items.filter((c) => c.op_code === opCode));
    }).catch(() => { if (alive) setConns([]); });
    return () => { alive = false; };
  }, [opCode, connVersion]);

  const delConn = async (id) => {
    try {
      await deleteCredential(id);
      setConnVersion((v) => v + 1);
    } catch { /* ignore — row stays */ }
  };

  // Edit a connection: reuse the Create Connect page in edit mode, passing
  // the credential along so it can prefill and PATCH.
  const editConn = (c) => {
    navigate(`/dashboard/observability/${opCode}/${c.env_code}/connect`, { state: { credential: c } });
  };

  // envCode -> display name, from the loaded environments.
  const envLabel = useMemo(() => {
    const map = {};
    envs.forEach((e) => { map[e.code] = e.name; });
    return (code) => map[code] || (code || '').toUpperCase();
  }, [envs]);

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
                {env.icon_svg && (
                  <span
                    className="xd-env-icon"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: env.icon_svg }}
                  />
                )}
                <span className="xd-env-name">{env.name}</span>
                <span className="xd-env-desc">{env.description}</span>
                <span className="xd-env-cta">Open <FiArrowRight /></span>
              </button>
            ))}
          </div>
        )}

        {/* Connections created via Create Connect (all envs of this op) */}
        {conns.length > 0 && (
          <>
            <h3 className="xd-subhead">Connections</h3>
            <div className="xd-card xd-conn-table-card">
              <table className="xd-conn-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Environment</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {conns.map((c) => (
                    <tr key={c.id}>
                      <td className="xd-conn-cell-name">{c.name}</td>
                      <td>{envLabel(c.env_code)}</td>
                      <td>
                        <span className={`xd-status ${c.is_active ? 'xd-status-active' : 'xd-status-onhold'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="xd-conn-cell-date">{fmtDateTime(c.created_at)}</td>
                      <td>
                        <div className="xd-conn-row-actions">
                          <button type="button" className="xd-icon-btn" title="Edit connection" onClick={() => editConn(c)}>
                            <FiEdit2 />
                          </button>
                          <button type="button" className="xd-proj-del" title="Delete connection" onClick={() => delConn(c.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
