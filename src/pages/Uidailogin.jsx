import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiActivity, FiShield, FiZap, FiCloud, FiEye, FiEyeOff,
  FiArrowLeft, FiCheckCircle, FiArrowRight,
} from 'react-icons/fi';
import '../assets/css/UIDAILogin.css';
import XopsLogo from '../components/XopsLogo';
import * as auth from '../api/auth';

const RESEND_COOLDOWN_SECONDS = 60;

// DEMO: when true and the login API is unreachable, sign in anyway with a
// placeholder token (after the fields are filled). Set to false to require
// a successful backend login.
const DEMO_BYPASS = false;

// Marketing highlights shown on the brand panel — purely presentational.
const FEATURES = [
  { icon: FiActivity, title: 'Real-time observability', desc: 'Live metrics across AIOps, InfraOps & SecOps' },
  { icon: FiZap, title: 'Automation, on autopilot', desc: 'Orchestrate operations without the toil' },
  { icon: FiCloud, title: 'Every cloud, one pane', desc: 'Azure, AWS & GCP in a single dashboard' },
];

const UIDAILogin = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState('creds');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [ephemeralToken, setEphemeralToken] = useState('');
  const [channels, setChannels] = useState({});
  const [otpChannel, setOtpChannel] = useState('email');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const otpInputRef = useRef(null);

  const validateUsername = (v) => (v.trim() ? '' : 'Username is required');
  const validatePassword = (v) => (v ? '' : 'Password is required');

  useEffect(() => {
    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    if (usernameTouched) setUsernameError(uErr);
    if (passwordTouched) setPasswordError(pErr);
  }, [username, password, usernameTouched, passwordTouched]);

  const isStep1Disabled =
    !username || !password || !!validateUsername(username) || !!validatePassword(password);
  const isOtpDisabled = otp.length !== 6;

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) otpInputRef.current.focus();
  }, [step]);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  // DEMO fallback: drop a placeholder token + session so the guarded
  // dashboard opens even though no real auth happened.
  const demoLogin = () => {
    localStorage.setItem('auth_token', 'demo-token');
    sessionStorage.setItem('uidai_user', username.trim() || 'Guest');
    sessionStorage.setItem('uidai_loggedIn', 'true');
    navigate('/dashboard');
  };

  const handleSendOtp = async () => {
    setUsernameTouched(true);
    setPasswordTouched(true);
    setSubmitError('');

    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    setUsernameError(uErr);
    setPasswordError(pErr);
    if (uErr || pErr) return;

    setSubmitting(true);
    try {
      const res = await auth.login({ login: username.trim(), password });
      if (res?.requiresOtp) {
        setEphemeralToken(res.ephemeralToken);
        setChannels(res.channelsAvailable || {});
        const channel =
          res.channelsAvailable?.email
            ? 'email'
            : res.channelsAvailable?.sms
            ? 'sms'
            : 'email';
        setOtpChannel(channel);
        await auth.sendOtp({ ephemeralToken: res.ephemeralToken, channel });
        setStep('otp');
        setResendIn(RESEND_COOLDOWN_SECONDS);
      } else {
        sessionStorage.setItem('uidai_user', username);
        sessionStorage.setItem('uidai_loggedIn', 'true');
        navigate('/dashboard');
      }
    } catch (err) {
      // If the API is unreachable (network error → no HTTP status) and demo
      // mode is on, bypass login instead of blocking the user.
      if (DEMO_BYPASS && !err?.status) {
        demoLogin();
        return;
      }
      setSubmitError(err?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (otp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      await auth.verifyOtp({ ephemeralToken, code: otp });
      sessionStorage.setItem('uidai_user', username);
      sessionStorage.setItem('uidai_loggedIn', 'true');
      navigate('/dashboard');
    } catch (err) {
      setOtpError(err?.message || 'Invalid OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || !ephemeralToken) return;
    setOtpError('');
    setSubmitting(true);
    try {
      await auth.sendOtp({ ephemeralToken, channel: otpChannel });
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setOtpError(err?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToCreds = () => {
    setStep('creds');
    setOtp('');
    setOtpError('');
    setEphemeralToken('');
    setResendIn(0);
  };

  const channelMobile = channels?.sms || channels?.mobile || channels?.phone;
  const channelEmail = channels?.email;

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
            <span className="xlogin-eyebrow">Automation Governance Platform</span>
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
                  <span className="xlogin-feat-icon"><Icon style={{ color: 'white' }} /></span>
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
              <FiShield style={{ color: 'white' }} /> Enterprise-grade security · SSO + OTP
            </span>
            <span className="xlogin-copy">© 2026 xOps · Internal Use Only</span>
          </div>
        </div>
      </aside>

      {/* ── Right: sign-in card ── */}
      <main className="xlogin-panel" id="mainContent">
        <div className="xlogin-card">
          <div className="xlogin-card-brand">
            <XopsLogo variant="mark" height={46} />
          </div>

          {step === 'creds' && (
            <>
              <div className="xlogin-card-head">
                <h2>Welcome back</h2>
                <p>Sign in to your xOps workspace to continue.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isStep1Disabled || submitting) return;
                  handleSendOtp();
                }}
                noValidate
              >
                <div className="xlogin-field">
                  <label className="xlogin-label" htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    className={`xlogin-input ${usernameTouched && usernameError ? 'xlogin-input-error' : ''}`}
                    placeholder="you@organisation.gov"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setUsernameTouched(true)}
                  />
                  {usernameTouched && usernameError && (
                    <div className="xlogin-error-msg">{usernameError}</div>
                  )}
                </div>

                <div className="xlogin-field">
                  <div className="xlogin-label-row">
                    <label className="xlogin-label" htmlFor="password">Password</label>
                    <Link to="/forgot-password" className="xlogin-forgot">Forgot password?</Link>
                  </div>
                  <div className="xlogin-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      className={`xlogin-input ${passwordTouched && passwordError ? 'xlogin-input-error' : ''}`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                    />
                    {password && (
                      <button
                        type="button"
                        className="xlogin-eye-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    )}
                  </div>
                  {passwordTouched && passwordError && (
                    <div className="xlogin-error-msg">{passwordError}</div>
                  )}
                </div>

                {submitError && (
                  <div className="xlogin-alert" role="alert">{submitError}</div>
                )}

                <button
                  type="submit"
                  className="xlogin-btn"
                  id="sendOtpBtn"
                  disabled={isStep1Disabled || submitting}
                >
                  {submitting ? 'Please wait…' : DEMO_BYPASS ? 'Sign in' : 'Continue'}
                  {!submitting && <FiArrowRight />}
                </button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="xlogin-card-head">
                <h2>Verify it's you</h2>
                <p>Enter the 6-digit code we just sent you.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isOtpDisabled || submitting) return;
                  handleVerifyOtp();
                }}
                noValidate
              >
                <div className="xlogin-otp-sent">
                  <FiCheckCircle />
                  <div>
                    <strong>One-time code sent</strong>
                    {channelMobile && <span>Mobile · {channelMobile}</span>}
                    {channelEmail && <span>Email · {channelEmail}</span>}
                  </div>
                </div>

                <div className="xlogin-field">
                  <label className="xlogin-label" htmlFor="otp">6-digit code</label>
                  <input
                    ref={otpInputRef}
                    type="password"
                    id="otp"
                    className={`xlogin-input xlogin-otp ${otpError ? 'xlogin-input-error' : ''}`}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  {otpError && <div className="xlogin-error-msg">{otpError}</div>}
                </div>

                <button
                  type="submit"
                  className="xlogin-btn"
                  id="loginBtn"
                  disabled={isOtpDisabled || submitting}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>

                <div className="xlogin-otp-actions">
                  <button
                    type="button"
                    className="xlogin-link-btn"
                    onClick={handleBackToCreds}
                    disabled={submitting}
                  >
                    <FiArrowLeft /> Back
                  </button>
                  <button
                    type="button"
                    className="xlogin-link-btn"
                    onClick={handleResendOtp}
                    disabled={resendIn > 0 || submitting}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="xlogin-card-foot">
            <span>Need access? <a href="#help">Contact your administrator</a></span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UIDAILogin;
