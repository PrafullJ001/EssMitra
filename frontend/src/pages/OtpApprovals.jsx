import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Spinner from "../components/common/Spinner";

export default function OtpApprovals() {
  const navigate = useNavigate();

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await axiosInstance.get(
        "/auth/pending-approvals"
      );

      setApprovals(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load OTP requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const getPurposeLabel = (purpose) => {
    if (purpose === "reset") {
      return "Password Reset";
    }

    if (purpose === "device") {
      return "New Device Login";
    }

    return "OTP Request";
  };

  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return "";

    const difference =
      new Date(expiresAt).getTime() - Date.now();

    if (difference <= 0) {
      return "Expired";
    }

    const minutes = Math.ceil(
      difference / 60000
    );

    return `Expires in ${minutes} min`;
  };

  return (
    <div className="min-h-screen bg-[#F6F2E9] pb-24">
      {/* Header */}
      <div
        className="relative px-6 pt-10 pb-16 overflow-hidden rounded-b-[2rem]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #1F3D2B 0%, #234730 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 14px)",
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              OTP Approvals
            </h1>

            <p className="text-[#B9D9BE] text-sm mt-1">
              Staff verification requests
            </p>
          </div>

          <button
            type="button"
            onClick={fetchApprovals}
            className="bg-white/10 border border-white/10 text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-8 relative z-10 max-w-md mx-auto">
        {loading && <Spinner label="Loading..." />}

        {!loading && error && (
          <div className="bg-[#FCEDED] border border-[#F3C6C6] rounded-2xl p-4">
            <p className="text-sm text-[#C24949]">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          approvals.length === 0 && (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-black/[0.04]">
              <div className="h-14 w-14 rounded-full bg-[#E9F3E9] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">
                  ✓
                </span>
              </div>

              <h2 className="font-bold text-[#1F2A22]">
                No Pending Requests
              </h2>

              <p className="text-sm text-[#5B6B5E] mt-2">
                New OTP requests will appear here.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          approvals.length > 0 && (
            <div className="space-y-4">
              {approvals.map((request) => (
                <div
                  key={request._id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-black/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-[#1F2A22] text-base">
                        {request.name}
                      </h2>

                      <p className="text-sm text-[#5B6B5E] mt-1">
                        {request.mobile}
                      </p>
                    </div>

                    <span className="text-[10px] uppercase font-bold tracking-wide bg-[#E9F3E9] text-[#2B5439] px-3 py-1.5 rounded-full">
                      {getPurposeLabel(
                        request.otpPurpose
                      )}
                    </span>
                  </div>

                  {/* OTP */}
                  <div className="mt-5 bg-[#F6F2E9] rounded-2xl p-4 text-center border border-[#1F3D2B]/5">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[#5B6B5E]">
                      Approval OTP
                    </p>

                    <p className="text-3xl font-bold tracking-[0.25em] text-[#1F3D2B] mt-2">
                      {request.otp}
                    </p>

                    <p className="text-xs text-[#C24949] font-medium mt-2">
                      {getRemainingTime(
                        request.otpExpires
                      )}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-[#5B6B5E] leading-relaxed">
                      Give this OTP only to the
                      verified staff member who
                      requested it.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="w-full mt-5 bg-white border border-[#4C9A5A]/30 text-[#4C9A5A] rounded-2xl py-3 text-sm font-bold shadow-sm hover:bg-[#E9F3E9] active:scale-[0.98] transition-all"
        >
          ← Back to Profile
        </button>
      </div>
    </div>
  );
}