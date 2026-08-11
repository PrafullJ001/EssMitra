import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { verifyDeviceRequest } from "../api/authApi";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // NEW: toggle for showing/hiding the password value
  const [showPassword, setShowPassword] = useState(false);

  // NEW: OTP state for new-device approval
  const [showDeviceOtp, setShowDeviceOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const {
    login,
    loading,
    error,
    pendingLoginMobile,
  } = useAuth();

  const navigate = useNavigate();

  // Local state to manage the 1.5-second display of the main login error
  const [localError, setLocalError] = useState("");

  // Clear main login error after 1.5 seconds
  useEffect(() => {
    if (error) {
      setLocalError(error);
      const timer = setTimeout(() => {
        setLocalError("");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear OTP error after 3.5 seconds (more time to read)
  useEffect(() => {
    if (otpError) {
      const timer = setTimeout(() => {
        setOtpError("");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [otpError]);

  // Get the same deviceId created by AuthContext
  const getDeviceId = () => {
    return localStorage.getItem("deviceId");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setOtpError("");

    const result = await login(
      identifier,
      password
    );

    // Normal successful login
    if (result === true) {
      navigate("/");
      return;
    }

    // New staff device requires admin OTP
    if (
      result?.requiresDeviceApproval === true
    ) {
      setShowDeviceOtp(true);
    }
  };

  const handleVerifyDevice = async (e) => {
    e.preventDefault();

    setOtpError("");

    if (!otp.trim()) {
      setOtpError("Please enter the OTP");
      return;
    }

    if (otp.trim().length !== 6) {
      setOtpError(
        "Please enter the 6-digit OTP"
      );
      return;
    }

    const deviceId = getDeviceId();

    if (!deviceId) {
      setOtpError(
        "Device ID not found. Please try logging in again."
      );
      return;
    }

    setOtpLoading(true);

    try {
      const { data } =
        await verifyDeviceRequest(
          pendingLoginMobile || identifier,
          otp.trim(),
          deviceId
        );

      // Save login token
      localStorage.setItem(
        "token",
        data.token
      );

      // Save user data
      localStorage.setItem(
        "user",
        JSON.stringify(data)
      );

      // Reload so AuthContext reads the newly saved user.
      window.location.href = "/";
    } catch (err) {
      setOtpError(
        err.response?.data?.message ||
          "OTP verification failed"
      );
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F1E8]">
      {/* Header block */}
      <div
        className="relative pt-16 pb-32 px-6 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(165deg, #1B3626 0%, #234730 50%, #2B5439 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 16px)",
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-80"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #E8A33D 0%, transparent 70%)",
              }}
            />
            <div className="relative h-24 w-24 rounded-full bg-[#4C9A5A]/20 border-[3px] border-[#E8A33D]/80 flex items-center justify-center overflow-hidden shadow-xl shadow-black/30">
              <img
                src="/icons/shree-krishna.png"
                alt="Shree Krishna"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <p className="text-[11px] tracking-[0.25em] uppercase text-[#9CC7A4] font-medium mb-3">
            Field Operations
          </p>

          <h1 className="text-[26px] leading-tight font-semibold text-white tracking-tight max-w-[260px]">
            Shree Krishna ESS Services
          </h1>

          <div className="w-10 h-[2px] rounded-full bg-[#E8A33D]/60 my-3" />

          <p className="text-sm text-[#B9D9BE]">
            {showDeviceOtp
              ? "Verify your new device"
              : "Sign in to manage today's schedule"}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 px-5 -mt-20 relative pb-8">
        {!showDeviceOtp ? (
          /* ==============================
             NORMAL LOGIN FORM
          ============================== */
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm mx-auto bg-white rounded-[28px] shadow-[0_24px_70px_-20px_rgba(31,61,43,0.45)] p-7 space-y-6 border border-black/[0.03]"
          >
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#5B6B5E] uppercase tracking-wider">
                Mobile or Email
              </label>

              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-[#8AA890] pointer-events-none">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                    <path
                      d="M4 6h16v12H4z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 7l8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    let val = e.target.value;
                    // If the user types only numbers, restrict it to 10 digits
                    if (/^\d+$/.test(val)) {
                      val = val.slice(0, 10);
                    }
                    setIdentifier(val);
                  }}
                  placeholder="98765 43210 or you@farm.com"
                  className="w-full bg-[#F5F3EA] border border-transparent rounded-2xl pl-11 pr-4 py-3 text-sm text-[#1F2A22] placeholder:text-[#A9B6AC] focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/60 focus:bg-white focus:border-[#DCE4DD] transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-[#5B6B5E] uppercase tracking-wider">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-[#4C9A5A] hover:text-[#2B5439] transition"
                >
                   Forgot Password?
                </button>
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-[#8AA890] pointer-events-none">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V7a4 4 0 1 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F5F3EA] border border-transparent rounded-2xl pl-11 pr-11 py-3 text-sm text-[#1F2A22] placeholder:text-[#A9B6AC] focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/60 focus:bg-white focus:border-[#DCE4DD] transition-all"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-4 flex items-center text-[#8AA890] hover:text-[#4C9A5A] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                      <path
                        d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 5.09A9.77 9.77 0 0 1 12 5c5 0 9 4.5 10 7-.42 1.1-1.15 2.32-2.16 3.44M6.61 6.61C4.47 8.06 2.9 10.03 2 12c1 2.5 5 7 10 7 1.44 0 2.8-.34 4-.9"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {localError && (
              <div className="flex items-start gap-2 bg-[#FCEDED] border border-[#F3C6C6] rounded-xl px-3.5 py-2.5">
                <p className="text-[#C24949] text-xs leading-snug">{localError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 text-white rounded-2xl py-3.5 font-semibold text-sm shadow-lg shadow-[#2B5439]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:brightness-105 hover:shadow-xl"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #4C9A5A 0%, #2B5439 100%)",
              }}
            >
              <span>{loading ? "Logging in..." : "Login"}</span>
              {!loading && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>
        ) : (
          /* ==============================
             NEW DEVICE OTP FORM
          ============================== */
          <form
            onSubmit={handleVerifyDevice}
            className="w-full max-w-sm mx-auto bg-white rounded-[28px] shadow-[0_24px_70px_-20px_rgba(31,61,43,0.45)] p-7 space-y-6 border border-black/[0.03]"
          >
            <div className="text-center">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-[#FFF4E2] text-[#E8A33D] flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 10V7a4 4 0 018 0v3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-[#1F2A22]">
                New Device Approval
              </h2>

              <p className="text-sm text-[#5B6B5E] mt-2 leading-relaxed">
                This is a new device. Ask your admin for the 6-digit approval
                OTP.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#5B6B5E] uppercase tracking-wider">
                Approval OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                className="w-full bg-[#F5F3EA] border border-transparent rounded-2xl px-4 py-3.5 text-center text-2xl font-semibold tracking-[0.4em] text-[#1F2A22] focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/60 focus:bg-white focus:border-[#DCE4DD] transition-all"
                required
              />
            </div>

            {otpError && (
              <div className="bg-[#FCEDED] border border-[#F3C6C6] rounded-xl px-3.5 py-2.5">
                <p className="text-[#C24949] text-xs">{otpError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={otpLoading}
              className="w-full text-white rounded-2xl py-3.5 font-semibold text-sm shadow-lg shadow-[#2B5439]/25 disabled:opacity-50 hover:brightness-105 hover:shadow-xl transition-all active:scale-[0.98]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #4C9A5A 0%, #2B5439 100%)",
              }}
            >
              {otpLoading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowDeviceOtp(false);
                setOtp("");
                setOtpError("");
              }}
              className="w-full text-sm font-semibold text-[#5B6B5E] hover:text-[#2B5439] transition"
            >
              ← Back to Login
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#3d413d] mt-6">
          Trouble signing in? Contact your admin.
        </p>

        {/* Footer credit */}
        <div className="flex flex-col items-center mt-7 gap-2">
          <div className="w-12 h-px bg-[#1F3D2B]/10" />

          
           <a  href="https://prafulljadhav.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#828684] font-semibold mb-1.5">
              Crafted &amp; Developed by
            </p>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1F3D2B] group-hover:text-[#4C9A5A] transition-colors border-b-2 border-[#4C9A5A]/70 group-hover:border-[#4C9A5A] pb-0.5">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 text-[#4C9A5A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                fill="none"
              >
                <path
                  d="M7 17L17 7M17 7H9M17 7v8"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Prafull Jadhav
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}