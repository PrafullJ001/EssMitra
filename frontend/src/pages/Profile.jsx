import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { updateProfileRequest } from "../api/authApi";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  // NEW: email edit state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email || "");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");

  const initials = (user?.name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditEmailClick = () => {
    setEmailInput(user?.email || "");
    setEmailError("");
    setIsEditingEmail(true);
  };

  const handleCancelEmail = () => {
    setEmailInput(user?.email || "");
    setEmailError("");
    setIsEditingEmail(false);
  };

  const handleSaveEmail = async () => {
    setEmailError("");

    const trimmed = emailInput.trim();

    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setEmailSaving(true);

    try {
      const { data } = await updateProfileRequest({
        email: trimmed,
      });

      // Backend returns the full updated user (_id, name, mobile,
      // email, role, businessName, sprayingUnitDetails)
      if (typeof updateUser === "function") {
        updateUser(data);
      } else {
        // Fallback: keep localStorage in sync so the change survives a refresh
        localStorage.setItem(
          "user",
          JSON.stringify(data)
        );
      }

      setIsEditingEmail(false);
    } catch (err) {
      setEmailError(
        err.response?.data?.message ||
          "Failed to update email"
      );
    } finally {
      setEmailSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
      {/* Header banner */}
      <div
        className="relative px-6 pt-12 pb-24 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1F3D2B 0%, #234730 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-white mt-4">
          <div className="w-24 h-24 rounded-[2rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl font-bold shadow-inner border border-white/20 mb-4 relative">
            {initials}

            <div className="absolute -bottom-2 bg-[#4C9A5A] text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border-2 border-[#1F3D2B] shadow-sm">
              {user?.role}
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {user?.name}
          </h1>

          <p className="text-[#B9D9BE] text-sm font-medium mt-1">
            Manage your account
          </p>
        </div>
      </div>

      {/* Overlapping content */}
      <div className="px-5 -mt-10 relative z-10 max-w-md mx-auto space-y-3">
        {/* Name Box */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#F6F2E9] text-[#1F3D2B]/50 flex items-center justify-center shrink-0 border border-[#1F3D2B]/5">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
            >
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-0.5">
              Full Name
            </p>

            <p className="text-base font-bold text-[#1F2A22]">
              {user?.name || "—"}
            </p>
          </div>
        </div>

        {/* Mobile Box */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#F6F2E9] text-[#1F3D2B]/50 flex items-center justify-center shrink-0 border border-[#1F3D2B]/5">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
            >
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-0.5">
              Mobile Number
            </p>

            <p className="text-base font-bold text-[#1F2A22]">
              {user?.mobile || "—"}
            </p>
          </div>
        </div>

        {/* Email Box */}
        <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5">
          {!isEditingEmail ? (
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#F6F2E9] text-[#1F3D2B]/50 flex items-center justify-center shrink-0 border border-[#1F3D2B]/5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                >
                  <path
                    d="M4 6h16v12H4z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 7l8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider mb-0.5">
                  Email
                </p>

                <p className="text-base font-bold text-[#1F2A22] truncate">
                  {user?.email || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={handleEditEmailClick}
                className="text-[#4C9A5A] hover:text-[#2B5439] transition shrink-0 p-1.5 rounded-lg hover:bg-[#F6F2E9]"
                aria-label="Edit email"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4.5 h-4.5"
                  fill="none"
                >
                  <path
                    d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-[#1F2A22]/50 tracking-wider">
                Email
              </p>

              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@farm.com"
                autoFocus
                className="w-full bg-[#F6F2E9] border border-transparent rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1F2A22] placeholder:text-[#A9B6AC] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#4C9A5A]/60 focus:bg-white focus:border-[#DCE4DD] transition-all"
              />

              {emailError && (
                <p className="text-[#C24949] text-xs font-medium">
                  {emailError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEmail}
                  disabled={emailSaving}
                  className="flex-1 text-white rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #4C9A5A 0%, #2B5439 100%)",
                  }}
                >
                  {emailSaving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEmail}
                  disabled={emailSaving}
                  className="flex-1 bg-[#F6F2E9] text-[#5B6B5E] rounded-xl py-2.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add User Action Box */}
        {isAdmin && (
          <button
            onClick={() => navigate("/add-user")}
            className="w-full bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 mt-2 flex items-center justify-between text-left active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#E9F3E9] text-[#4C9A5A] flex items-center justify-center shrink-0 border border-[#4C9A5A]/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                >
                  <path
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5">
                  Add New User
                </p>

                <p className="text-[13px] text-[#1F2A22]/50 font-medium">
                  Create staff or admin accounts
                </p>
              </div>
            </div>

            <div className="text-[#1F2A22]/20 group-hover:text-[#4C9A5A] group-active:translate-x-1 transition-all">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Manage Staff Login - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => navigate("/manage-staff-login")}
            className="w-full bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center justify-between text-left active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#EEF2FF] text-[#4F5FAD] flex items-center justify-center shrink-0 border border-[#4F5FAD]/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                >
                  <path
                    d="M16 17l5-5-5-5M21 12H9M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5">
                  Manage Staff Login
                </p>

                <p className="text-[13px] text-[#1F2A22]/50 font-medium">
                  View and sign out logged-in staff
                </p>
              </div>
            </div>

            <div className="text-[#1F2A22]/20 group-hover:text-[#4F5FAD] group-active:translate-x-1 transition-all">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Expenses - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => navigate("/expenses")}
            className="w-full bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center justify-between text-left active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#FCEDED] text-[#C24949] flex items-center justify-center shrink-0 border border-[#C24949]/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                >
                  <path
                    d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5">
                  Expenses
                </p>

                <p className="text-[13px] text-[#1F2A22]/50 font-medium">
                  Track maintenance, diesel & staff costs
                </p>
              </div>
            </div>

            <div className="text-[#1F2A22]/20 group-hover:text-[#C24949] group-active:translate-x-1 transition-all">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Staff Performance - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => navigate("/staff-performance")}
            className="w-full bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center justify-between text-left active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#E9F3E9] text-[#4C9A5A] flex items-center justify-center shrink-0 border border-[#4C9A5A]/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                >
                  <path
                    d="M4 19V9M10 19V5M16 19v-7M22 19V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5">
                  Staff Performance
                </p>

                <p className="text-[13px] text-[#1F2A22]/50 font-medium">
                  View staff activity and performance
                </p>
              </div>
            </div>

            <div className="text-[#1F2A22]/20 group-hover:text-[#4C9A5A] group-active:translate-x-1 transition-all">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* OTP Approvals - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => navigate("/otp-approvals")}
            className="w-full bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center justify-between text-left active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#FFF4E2] text-[#E8A33D] flex items-center justify-center shrink-0 border border-[#E8A33D]/10">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                  fill="none"
                >
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
                    strokeLinecap="round"
                  />
                  <circle
                    cx="12"
                    cy="15"
                    r="1"
                    fill="currentColor"
                  />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5">
                  OTP Approvals
                </p>

                <p className="text-[13px] text-[#1F2A22]/50 font-medium">
                  View password reset and device OTPs
                </p>
              </div>
            </div>

            <div className="text-[#1F2A22]/20 group-hover:text-[#E8A33D] group-active:translate-x-1 transition-all">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
              >
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 bg-[#FCEDED]/60 hover:bg-[#FCEDED] border border-[#F3C6C6]/60 text-[#C24949] rounded-[1.5rem] py-4 font-bold text-[15px] active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-sm"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
          >
            <path
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          Logout
        </button>
      </div>
    </div>
  );
}