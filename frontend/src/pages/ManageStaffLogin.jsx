import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllStaff, signOutStaff } from "../api/staffApi";
import Spinner from "../components/common/Spinner";

export default function ManageStaffLogin() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  // Admins are shown for status visibility only — no sign-out flow, since
  // admins skip the device-trust/OTP check entirely on login (see the
  // comment in the fetch effect below).
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracks which staff row is mid sign-out, and confirmation state
  const [signingOutId, setSigningOutId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data } = await getAllStaff();
        // Only staff accounts have the device-trust/OTP flow — admins
        // skip that check entirely on login, so signing them out here
        // wouldn't do anything meaningful.
        setStaff(data.filter((u) => u.role === "staff"));
        setAdmins(data.filter((u) => u.role === "admin"));
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load staff list"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleSignOut = async (userId) => {
    setSigningOutId(userId);
    setConfirmId(null);

    try {
      await signOutStaff(userId);

      setStaff((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, trustedDevices: [] } : u
        )
      );

      setToast("Signed out successfully");
      setTimeout(() => setToast(""), 2500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to sign out staff member"
      );
    } finally {
      setSigningOutId(null);
    }
  };

  if (loading) {
    return <Spinner label="Loading staff..." />;
  }

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24 font-sans selection:bg-[#4C9A5A]/20">
      {/* Header */}
      <div
        className="relative px-6 pt-10 pb-16 overflow-hidden rounded-b-[2.5rem] shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1F3D2B 0%, #234730 60%, #2B5439 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)",
          }}
        />

        <div className="relative flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div>
            <p className="text-xs text-[#B9D9BE] font-medium tracking-wide uppercase mb-0.5">
              Access Control
            </p>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Manage Staff Login
            </h1>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-8 relative z-10 max-w-2xl mx-auto space-y-3">
        {toast && (
          <div className="bg-[#E9F3E9] border border-[#4C9A5A]/20 rounded-2xl px-4 py-3 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#4C9A5A] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[#2B5439] text-sm font-semibold">{toast}</p>
          </div>
        )}

        {error && (
          <div className="bg-[#FCEDED] border border-[#F3C6C6] rounded-2xl px-4 py-3">
            <p className="text-[#C24949] text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* ADMINS — status visibility only, no sign-out controls. Uses the
            same trustedDevices-based badge as staff, but is never
            interactive: admins don't go through the device-trust/OTP
            flow, so there's nothing meaningful to sign out here. */}
        {admins.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#1F2A22]/40 px-1">
              Admins
            </p>
            {admins.map((admin) => {
              const deviceCount = admin.trustedDevices?.length || 0;
              const isTrusted = deviceCount > 0;

              return (
                <div
                  key={admin._id}
                  className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-2xl bg-[#F6F2E9] text-[#1F3D2B]/60 flex items-center justify-center shrink-0 border border-[#1F3D2B]/5 font-bold text-sm">
                    {admin.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5 truncate">
                      {admin.name}
                    </p>
                    <p className="text-[13px] text-[#1F2A22]/50 font-medium mb-1.5">
                      {admin.mobile}
                    </p>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isTrusted
                          ? "text-[#4C9A5A] bg-[#E9F3E9] border-[#4C9A5A]/20"
                          : "text-[#1F2A22]/40 bg-[#F6F2E9] border-black/[0.04]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isTrusted ? "bg-[#4C9A5A]" : "bg-[#1F2A22]/30"
                        }`}
                      />
                      {isTrusted ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STAFF — unchanged: same list, same sign-out confirm flow */}
        {staff.length === 0 ? (
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-8 text-center">
            <p className="text-sm text-[#1F2A22]/50 font-medium">
              No staff accounts found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.length > 0 && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#1F2A22]/40 px-1 pt-1">
                Staff
              </p>
            )}
            {staff.map((member) => {
            const deviceCount = member.trustedDevices?.length || 0;
            const isTrusted = deviceCount > 0;

            return (
              <div
                key={member._id}
                className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-5 flex items-center gap-4"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#F6F2E9] text-[#1F3D2B]/60 flex items-center justify-center shrink-0 border border-[#1F3D2B]/5 font-bold text-sm">
                  {member.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1F2A22] text-base leading-tight mb-0.5 truncate">
                    {member.name}
                  </p>
                  <p className="text-[13px] text-[#1F2A22]/50 font-medium mb-1.5">
                    {member.mobile}
                  </p>

                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isTrusted
                        ? "text-[#4C9A5A] bg-[#E9F3E9] border-[#4C9A5A]/20"
                        : "text-[#1F2A22]/40 bg-[#F6F2E9] border-black/[0.04]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isTrusted ? "bg-[#4C9A5A]" : "bg-[#1F2A22]/30"
                      }`}
                    />
                    {isTrusted
                      ? `${deviceCount} device${deviceCount > 1 ? "s" : ""} trusted`
                      : "No active devices"}
                  </span>
                </div>

                {confirmId === member._id ? (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSignOut(member._id)}
                      disabled={signingOutId === member._id}
                      className="text-xs font-bold text-white bg-[#C24949] rounded-lg px-3 py-1.5 disabled:opacity-50"
                    >
                      {signingOutId === member._id ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs font-semibold text-[#1F2A22]/50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(member._id)}
                    disabled={!isTrusted}
                    className="shrink-0 text-xs font-bold text-[#C24949] bg-[#FCEDED] border border-[#F3C6C6] rounded-xl px-3.5 py-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F3C6C6]/40 transition-all active:scale-95"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}