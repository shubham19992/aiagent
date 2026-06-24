import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity, FiShield, FiZap, FiCloud, FiArrowLeft, FiArrowRight, FiCheckCircle,
} from 'react-icons/fi';
import '../assets/css/UIDAILogin.css';
import XopsLogo from '../components/XopsLogo';
import * as auth from '../api/auth';

// Marketing highlights shown on the brand panel — purely presentational.
const FEATURES = [
  { icon: FiActivity, title: 'Real-time observability', desc: 'Live metrics across AIOps, InfraOps & SecOps' },
  { icon: FiZap, title: 'Automation, on autopilot', desc: 'Orchestrate operations without the toil' },
  { icon: FiCloud, title: 'Every cloud, one pane', desc: 'Azure, AWS & GCP in a single dashboard' },
];

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [sent, setSent] = useState(false);

  const isDisabled = !identifier.trim() || submitting;

  const handleSend = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (submitting) return;
    setSubmitError('');
    if (!identifier.trim()) return;
    setSubmitting(true);
    try {
      await auth.forgotPassword({ loginOrEmail: identifier.trim(), channel: 'email' });
      setSent(true);
    } catch (err) {
      setSubmitError(err?.message || 'Could not send reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="xlogin">
      {/* ── Left: brand / product hero ── */}
      <aside className="xlogin-hero">
        <div className="xlogin-hero-grid" aria-hidden="true" />
        <div className="xlogin-hero-glow" aria-hidden="true" />

        <div className="xlogin-hero-inner">
          <div className="xlogin-brand">
            <XopsLogo height={40} />
          </div>

          <div className="xlogin-hero-body">
            <h1 className="xlogin-hero-title">
              Run every operation<br />from a single pane.
            </h1>
            <p className="xlogin-hero-sub">
              Monitor your clouds, automate operations and govern your
              infrastructure — securely, in real time.
            </p>

            <ul className="xlogin-features">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="xlogin-feature">
                  <span className="xlogin-feat-icon"><Icon style={{ color: 'white' }}/></span>
                  <div>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="xlogin-hero-foot">
            <span className="xlogin-trust">
              <FiShield /> Enterprise-grade security · SSO + OTP
            </span>
            <span className="xlogin-copy">© 2026 xOps · Internal Use Only</span>
          </div>
        </div>
      </aside>

      {/* ── Right: reset-password card ── */}
      <main className="xlogin-panel" id="mainContent">
        <div className="xlogin-card">
          <div className="xlogin-card-brand">
            <XopsLogo variant="mark" height={46} />
          </div>

          <div className="xlogin-card-head">
            <h2>Reset your password</h2>
            <p>Enter your username or email and we'll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="xlogin-otp-sent">
              <FiCheckCircle />
              <div>
                <strong>Request received</strong>
                <span>If an account matches, a reset link has been sent to the registered email.</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSend} noValidate>
              <div className="xlogin-field">
                <label className="xlogin-label" htmlFor="forgot-identifier">Username or email</label>
                <input
                  type="text"
                  id="forgot-identifier"
                  className="xlogin-input"
                  placeholder="you@organisation.gov"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              {submitError && <div className="xlogin-alert" role="alert">{submitError}</div>}

              <button type="submit" className="xlogin-btn" id="sendLinkBtn" disabled={isDisabled}>
                {submitting ? 'Sending…' : 'Send reset link'}
                {!submitting && <FiArrowRight />}
              </button>
            </form>
          )}

          <div className="xlogin-card-foot">
            <Link to="/login" className="xlogin-link-btn"><FiArrowLeft /> Back to login</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
