import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from '../useAuth';
import { apiUrl } from "../api";
import "./Auth.css";

const initialSignup = {
  name: "",
  phone: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function getPasswordChecks(password) {
  return [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains a letter",
      valid: /[a-zA-Z]/.test(password),
    },
    {
      label: "Contains a number",
      valid: /\d/.test(password),
    },
    {
      label: "At most 72 UTF-8 bytes",
      valid: new TextEncoder().encode(password).length <= 72,
    },
  ];
}

function getPasswordStrength(password) {
  if (!password) return { label: "", score: 0 };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-zA-Z]/.test(password) && /\d/.test(password)) score++;
  if (password.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", score: 1 };
  if (score === 2) return { label: "Fair", score: 2 };
  if (score === 3) return { label: "Good", score: 3 };

  return { label: "Strong", score: 4 };
}

function Auth() {
  const navigate = useNavigate();
  const { login: fetchtoken } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signup, setSignup] = useState(initialSignup);
  const [usernameStatus, setUsernameStatus] = useState("idle");

  const [login, setLogin] = useState({
    identifier: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordChecks = getPasswordChecks(signup.password);
  const passwordStrength = getPasswordStrength(signup.password);

  useEffect(() => {
    const value = signup.username.trim();

    if (value.length < 3) {
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const response = await fetch(
          apiUrl(`/api/auth/check-username?username=${encodeURIComponent(value)}`),
          { signal: controller.signal }
        );

        if (!response.ok) {
          setUsernameStatus("error");
          return;
        }

        const result = await response.json();

        setUsernameStatus(
          result.available ? "available" : "taken"
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          setUsernameStatus("error");
        }
        console.log(error);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signup.username]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  function updateSignup(event) {
    const { name, value } = event.target;

    setSignup((previous) => ({
      ...previous,
      [name]: value,
    }));
    if (name === "username" && value.trim().length < 3) {
      setUsernameStatus("idle");
    }

    setError("");
    setMessage("");
  }

  function updateLogin(event) {
    const { name, value } = event.target;

    setLogin((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
  }

  async function handleSignup(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!signup.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!validatePhone(signup.phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(signup.username)) {
      setError(
        "Username must be 3 to 20 characters using letters, numbers, or underscores."
      );
      return;
    }

    if (!passwordChecks.every((check) => check.valid)) {
      setError("Please meet the password requirements.");
      return;
    }

    if (signup.password !== signup.confirmPassword) {
      setError("Your passwords don't match yet.");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: signup.name,
          phone: signup.phone,
          username: signup.username,
          password: signup.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Signup failed");
      }
      fetchtoken(data.accessToken);

      navigate("/workspace");

    } catch (err) {
      console.error("Signup failed:", err);
      setError(err.message || "Something went wrong.");
    }

  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!login.identifier.trim()) {
      setError("Enter your phone number or username.");
      return;
    }
    if (!login.password) {
      setError("Please enter your password.");
      return;
    }

    const identifier = login.identifier.trim();
    const isPhone = validatePhone(identifier);

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(isPhone ? { phone: identifier } : { username: identifier }),
          password: login.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Login failed");
      }
      fetchtoken(data.accessToken);
      navigate("/workspace");
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true">
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
        <div className="auth-orb auth-orb-three" />
        <div className="auth-grid" />
      </div>

      <a
        className="auth-brand"
        href="/"
        aria-label="SplitEase home"
      >
        <span className="auth-brand-icon" aria-hidden="true">
          <img src="/favicon.svg" alt="" width="40" height="40" />
        </span>
        <span>
          Split<span className="auth-brand-accent">Ease</span>
        </span>
      </a>

      <div className={`auth-shell ${mode === "signup" ? "is-signup" : ""}`}>
        <section className="auth-form-side">
          <div className="auth-mobile-brand">
            <span className="auth-eyebrow">YOUR MONEY, IN HARMONY</span>
          </div>

          <div className="auth-form-inner">
            <div className="auth-heading">
              <span className="auth-kicker">
                {mode === "signin" ? "WELCOME BACK" : "YOUR NEXT CHAPTER"}
              </span>

              <h1>
                {mode === "signin" ? (
                  <>
                    Good to see you
                    <br />
                    <span>again.</span>
                  </>
                ) : (
                  <>
                    Let’s make
                    <br />
                    <span>expenses simpler.</span>
                  </>
                )}
              </h1>

              <p>
                {mode === "signin"
                  ? "Your expenses, friends, and balances are right where you left them."
                  : "Create your account and make splitting expenses the easiest part of your day."}
              </p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Authentication">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={mode === "signin" ? "active" : ""}
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={mode === "signup" ? "active" : ""}
                onClick={() => switchMode("signup")}
              >
                Create account
              </button>

              <span
                className={`auth-tab-indicator ${mode === "signup" ? "indicator-right" : ""
                  }`}
              />
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            {message && (
              <div className="auth-alert auth-alert-success" role="status">
                <span aria-hidden="true">✓</span>
                {message}
              </div>
            )}

            {mode === "signin" ? (
              <form
                className="auth-form"
                onSubmit={handleLogin}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="login-identifier">
                    Phone number or username
                  </label>

                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21C4 16.8 7.1 14 12 14s8 2.8 8 7" />
                      </svg>
                    </span>

                    <input
                      id="login-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="Enter phone or username"
                      value={login.identifier}
                      onChange={updateLogin}
                    />
                  </div>
                </div>

                <div className="auth-field">
                    <label htmlFor="login-password">Password</label>

                    <div className="auth-input-wrap">
                      <span className="auth-input-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect x="4" y="10" width="16" height="11" rx="3" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                          <path d="M12 14v3" />
                        </svg>
                      </span>

                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={login.password}
                        onChange={updateLogin}
                      />

                      <button
                        className="auth-eye"
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>

                </div>

                <button type="submit" className="auth-submit">
                  <span>
                    Sign in to SplitEase
                  </span>
                  <span className="auth-submit-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>

                <p className="auth-switch-copy">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                  >
                    Create an account
                  </button>
                </p>
              </form>
            ) : (
              <form
                className="auth-form auth-signup-form"
                onSubmit={handleSignup}
                noValidate
              >
                <div className="auth-field">
                  <label htmlFor="signup-name">Full name</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21C4 16.8 7.1 14 12 14s8 2.8 8 7" />
                      </svg>
                    </span>
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="What should we call you?"
                      value={signup.name}
                      onChange={updateSignup}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-phone">Phone number</label>
                  <div className="auth-input-wrap">
                    <span className="auth-country-code">🇮🇳 +91</span>
                    <input
                      id="signup-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="98765 43210"
                      value={signup.phone}
                      onChange={(event) =>
                        updateSignup({
                          ...event,
                          target: {
                            ...event.target,
                            name: "phone",
                            value: event.target.value.replace(/\D/g, ""),
                          },
                        })
                      }
                    />
                  </div>
                  <span className="auth-field-hint">
                    We'll use this for account verification.
                  </span>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-username">Username</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon auth-at-icon" aria-hidden="true">
                      @
                    </span>
                    <input
                      id="signup-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Choose a unique username"
                      value={signup.username}
                      onChange={updateSignup}

                    />
                  </div>
                  <span className="auth-field-hint">
                    3 to 20 characters. Letters, numbers, and underscores.
                  </span>
                  {usernameStatus === "checking" && (
                    <span className="auth-field-hint">Checking username...</span>
                  )}

                  {usernameStatus === "available" && (
                    <span className="auth-field-hint" style={{ color: "#2e8400c2" }}>
                      Username is available ✓
                    </span>
                  )}

                  {usernameStatus === "taken" && (
                    <span className="auth-field-hint" style={{ color: "#c5242491" }}>
                      Username already exists ✗
                    </span>
                  )}

                  {usernameStatus === "error" && (
                    <span className="auth-field-hint">Unable to check username. Try again.</span>
                  )}
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="10" width="16" height="11" rx="3" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        <path d="M12 14v3" />
                      </svg>
                    </span>
                    <input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      maxLength={72}
                      value={signup.password}
                      onChange={updateSignup}
                    />
                    <button
                      className="auth-eye"
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="auth-password-feedback">
                    <div className="auth-strength-track" aria-label={`Password strength: ${passwordStrength.label || "not entered"}`}>
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={
                            level <= passwordStrength.score
                              ? `strength-filled strength-${passwordStrength.score}`
                              : ""
                          }
                        />
                      ))}
                    </div>
                    <span className={`auth-strength-label strength-text-${passwordStrength.score}`}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="auth-password-checks">
                    {passwordChecks.map((check) => (
                      <span
                        key={check.label}
                        className={check.valid ? "check-valid" : ""}
                      >
                        <span aria-hidden="true">
                          {check.valid ? "✓" : "○"}
                        </span>
                        {check.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-confirm-password">
                    Confirm password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="10" width="16" height="11" rx="3" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        <path d="m9 15 2 2 4-4" />
                      </svg>
                    </span>
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Enter your password again"
                      value={signup.confirmPassword}
                      onChange={updateSignup}
                    />
                    <button
                      className="auth-eye"
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  {signup.confirmPassword && (
                    <span
                      className={`auth-match-hint ${signup.password === signup.confirmPassword
                        ? "match-valid"
                        : ""
                        }`}
                    >
                      {signup.password === signup.confirmPassword
                        ? "✓ Passwords match"
                        : "Passwords don't match yet"}
                    </span>
                  )}
                </div>

                <button type="submit" className="auth-submit">
                  <span>Create my account</span>
                  <span className="auth-submit-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>

                <p className="auth-terms">
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy.
                </p>

                <p className="auth-switch-copy">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>

          <div className="auth-footer">
            <span>© {new Date().getFullYear()} SplitEase</span>
            <span className="auth-footer-secure">
              <span aria-hidden="true">●</span> Your finances, kept personal
            </span>
          </div>
        </section>

        <aside className="auth-visual-side">
          <div className="auth-visual-glow" />
          <div className="auth-visual-content">
            <div className="auth-visual-top">
              <span className="auth-visual-pill">
                <span className="auth-live-dot" />
                LESS AWKWARD. MORE TOGETHER.
              </span>
              <span className="auth-visual-decoration">✳</span>
            </div>

            <div className="auth-visual-copy">
              <p className="auth-visual-overline">
                GOOD FRIENDS. CLEAR BALANCES.
              </p>
              <h2>
                Expenses together?
                <br />
                <span>split the</span>
                <br />
                awkwardness.
              </h2>
              <p className="auth-visual-description">
                Trips, dinners, rent, that one friend who always forgets.
                Keep every split simple and every friendship happy.
              </p>
            </div>

            <div className="auth-demo-card">
              <div className="auth-demo-card-top">
                <div>
                  <span className="auth-demo-label">YOUR LITTLE SQUAD</span>
                  <strong>Weekend in Goa</strong>
                </div>
                <div className="auth-avatar-stack" aria-label="Three friends">
                  <span>R</span>
                  <span>A</span>
                  <span>M</span>
                </div>
              </div>

              <div className="auth-demo-divider" />

              <div className="auth-demo-expense">
                <div className="auth-demo-expense-icon">↗</div>
                <div className="auth-demo-expense-info">
                  <strong>Beachside dinner</strong>
                  <span>Paid by you</span>
                </div>
                <div className="auth-demo-amount">
                  <strong>₹2,400</strong>
                  <span>total bill</span>
                </div>
              </div>

              <div className="auth-demo-balance">
                <div className="auth-demo-balance-icon">✓</div>
                <div>
                  <strong>Everyone's in the loop</strong>
                  <span>Splits made simple.</span>
                </div>
                <span className="auth-demo-sparkle">✦</span>
              </div>
            </div>

            <div className="auth-visual-bottom">
              <div className="auth-visual-bottom-mark">S.</div>
              <p>
                Split fairly.
                <br />
                <span>Stay close.</span>
              </p>
              <div className="auth-visual-bottom-line" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default Auth;
