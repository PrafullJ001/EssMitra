import { useState } from "react";
import {
  registerFarmer,
  checkDuplicateFarmer,
  checkSimilarFarmers,
  updateFarmer,
} from "../../api/farmerApi";
import { VILLAGES } from "../../constants/serviceOptions";

// English-only filter for free-text name entry. Blocks Devanagari
// (Marathi) and any other non-Latin script, but still allows the
// punctuation real names commonly use (apostrophe, hyphen, dot).
const ENGLISH_NAME_REGEX = /[^A-Za-z\s.'-]/g;

// Display-only bilingual labels for the Village dropdown. The stored
// value is always the plain English string from VILLAGES — this map
// only changes what's shown in the option text.
const VILLAGE_LABELS = {
  Pimpri: "Pimpri (पिंपरी)",
  Raulas: "Raulas (रौळस)",
  Vadali: "Vadali (वडाळी)",
  Kundevadi: "Kundevadi (कुंदेवाडी)",
  Nandurdi: "Nandurdi (नांदुर्डी)",
  Devpur: "Devpur (देवपूर)",
  Sukena: "Sukena (सुकेणा)",
  Pimplas: "Pimplas (पिंपळस)",
  Dawachwadi: "Dawachwadi (दावचवाडी)",
  Lonwadi: "Lonwadi (लोणवाडी)",
  Chandwad: "Chandwad (चांदवड)",
  Others: "Others (इतर)",
};

export default function FarmerForm({
  existingFarmer,
  onSuccess,
  onCancel,
}) {
  const isEditMode = !!existingFarmer;

  const existingVillage = existingFarmer?.village || "";

  const isExistingCustomVillage =
    existingVillage &&
    !VILLAGES.includes(existingVillage);

  const [selectedVillage, setSelectedVillage] = useState(
    isExistingCustomVillage ? "Others" : existingVillage
  );

  const [form, setForm] = useState({
    fullName: existingFarmer?.fullName || "",
    mobile: existingFarmer?.mobile || "",
    altMobile: existingFarmer?.altMobile || "",
    village: existingVillage,
    notes: existingFarmer?.notes || "",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [similarFarmers, setSimilarFarmers] = useState(null);
  const [confirmedProceed, setConfirmedProceed] = useState(false);

  // NEW: inline English-only validation errors
  const [nameError, setNameError] = useState("");
  const [mobileError, setMobileError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setSimilarFarmers(null);
    setConfirmedProceed(false);
  };

  // Full Name: English letters only (blocks Devanagari/Marathi as you
  // type), shows an inline error until the offending characters are
  // removed.
  const handleNameChange = (e) => {
    const raw = e.target.value;
    const filtered = raw.replace(ENGLISH_NAME_REGEX, "");

    setForm((prev) => ({
      ...prev,
      fullName: filtered,
    }));

    setNameError(
      raw !== filtered
        ? "Please use English letters only"
        : ""
    );

    setSimilarFarmers(null);
    setConfirmedProceed(false);
  };

  // Mobile: digits only, maximum 10 digits. Now also shows an inline
  // error if a non-digit (including Devanagari numerals) was typed.
  const handleMobileChange = (e) => {
    const raw = e.target.value;
    const filtered = raw
      .replace(/\D/g, "")
      .slice(0, 10);

    setForm({
      ...form,
      mobile: filtered,
    });

    setMobileError(
      /\D/.test(raw)
        ? "Please enter numbers only (0-9)"
        : ""
    );

    setSimilarFarmers(null);
    setConfirmedProceed(false);
  };

  const handleVillageChange = (e) => {
    const value = e.target.value;

    setSelectedVillage(value);

    setForm({
      ...form,
      village: value === "Others" ? "" : value,
    });

    setSimilarFarmers(null);
    setConfirmedProceed(false);
  };

  const handleOtherVillageChange = (e) => {
    setForm({
      ...form,
      village: e.target.value,
    });

    setSimilarFarmers(null);
    setConfirmedProceed(false);
  };

  const doActualSave = async () => {
    setLoading(true);

    try {
      if (isEditMode) {
        const { data } = await updateFarmer(
          existingFarmer._id,
          form
        );

        onSuccess(data);
      } else {
        const { data: dupCheck } =
          await checkDuplicateFarmer(form.mobile);

        if (dupCheck.duplicate) {
          setError(
            `Farmer already exists: ${dupCheck.farmer.fullName} • ${dupCheck.farmer.mobile} • ${dupCheck.farmer.village} (${dupCheck.farmer.farmerCode})`
          );

          setLoading(false);
          return;
        }

        const { data: newFarmer } =
          await registerFarmer(form);

        onSuccess(newFarmer);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save farmer"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError(null);

    // Require at least first name and last name
    const nameParts = form.fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (nameParts.length < 2) {
      setError(
        "Please enter both first name and last name"
      );
      return;
    }

    // Mobile must contain exactly 10 digits
    if (!/^\d{10}$/.test(form.mobile)) {
      setError(
        "Please enter a valid 10-digit mobile number"
      );
      return;
    }

    // Make sure custom village is entered
    if (
      selectedVillage === "Others" &&
      !form.village.trim()
    ) {
      setError("Please enter village name");
      return;
    }

    // Skip similarity check in edit mode
    // or if already confirmed
    if (isEditMode || confirmedProceed) {
      await doActualSave();
      return;
    }

    // Check for same name + same village
    // before registering
    setLoading(true);

    try {
const { data } =
  await checkSimilarFarmers(
    form.fullName,
    form.mobile
  );

      if (data.length > 0) {
        setSimilarFarmers(data);
        setLoading(false);
        return;
      }

      await doActualSave();
    } catch (err) {
      setError(
        "Could not check for similar farmers"
      );

      setLoading(false);
    }
  };

  const handleConfirmProceed = () => {
    setConfirmedProceed(true);
    setSimilarFarmers(null);
    doActualSave();
  };

  const inputClassName =
    "w-full bg-[#F6F2E9]/50 border border-black/[0.05] rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[#1F2A22] placeholder:text-[#1F2A22]/30 focus:outline-none focus:ring-4 focus:ring-[#4C9A5A]/10 focus:border-[#4C9A5A]/50 transition-all";

  const labelClassName =
    "block text-[12px] font-bold text-[#1F2A22]/60 uppercase tracking-wider mb-1.5 ml-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[1.5rem] shadow-sm border border-black/[0.04] p-6 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-[#E9F3E9] flex items-center justify-center text-[#4C9A5A]">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
          >
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="font-bold text-xl text-[#1F2A22]">
          {isEditMode ? "Edit Farmer" : "New Farmer"}
        </h2>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className={labelClassName}>
            Full Name / पूर्ण नाव
          </label>

          <input
            name="fullName"
            value={form.fullName}
            onChange={handleNameChange}
            required
            placeholder="e.g. Ramesh Jadhav"
            className={inputClassName}
          />

          {nameError ? (
            <p className="text-[11px] text-[#C24949] font-semibold mt-1.5 ml-1">
              {nameError}
            </p>
          ) : (
            <p className="text-[11px] text-[#1F2A22]/40 mt-1.5 ml-1">
              Enter first name and last name (English only)
            </p>
          )}
        </div>

        {/* Mobile Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className={`${labelClassName.replace(
                "block",
                "flex"
              )} items-end min-h-[2.25rem] sm:min-h-0`}
            >
              Mobile / मोबाईल
            </label>

            <input
              name="mobile"
              type="tel"
              inputMode="numeric"
              value={form.mobile}
              onChange={handleMobileChange}
              required
              minLength={10}
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder="10 digits"
              className={inputClassName}
            />

            {mobileError ? (
              <p className="text-[11px] text-[#C24949] font-semibold mt-1.5 ml-1">
                {mobileError}
              </p>
            ) : (
              <p className="text-[11px] text-[#1F2A22]/40 mt-1.5 ml-1">
                {form.mobile.length}/10 digits
              </p>
            )}
          </div>

          <div>
            <label
              className={`${labelClassName.replace(
                "block",
                "flex"
              )} items-end min-h-[2.25rem] sm:min-h-0`}
            >
              Alt Mobile / पर्यायी मोबाईल
            </label>

            <input
              name="altMobile"
              type="tel"
              inputMode="tel"
              value={form.altMobile}
              onChange={handleChange}
              placeholder="Optional"
              className={inputClassName}
            />
          </div>
        </div>

        {/* Village */}
        <div>
          <label className={labelClassName}>
            Village / गाव
          </label>

          <select
            value={selectedVillage}
            onChange={handleVillageChange}
            required
            className={inputClassName}
          >
            <option value="">
              Select village
            </option>

            {VILLAGES.map((village) => (
              <option
                key={village}
                value={village}
              >
                {VILLAGE_LABELS[village] || village}
              </option>
            ))}
          </select>

          {selectedVillage === "Others" && (
            <input
              type="text"
              value={form.village}
              onChange={handleOtherVillageChange}
              required
              placeholder="Enter village name"
              className={`${inputClassName} mt-2`}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label className={labelClassName}>
            Notes / टीप
          </label>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Any specific requirements..."
            className={`${inputClassName} resize-none`}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 p-3.5 bg-[#FCEDED] border border-[#C24949]/20 rounded-xl flex items-start gap-2.5 animate-in fade-in">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-[#C24949] shrink-0 mt-0.5"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="M12 8v5M12 16h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <p className="text-[#C24949] text-[13px] font-medium leading-tight">
            {error}
          </p>
        </div>
      )}

      {/* Similar Farmer Warning */}
      {similarFarmers &&
        similarFarmers.length > 0 && (
          <div className="mt-6 bg-[#FFF8ED] border border-[#F5D0A9] rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#FDE6CD] flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-[#D97706]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-[14px] font-bold text-[#9C5B14] leading-tight mb-1">
                 Found {similarFarmers.length} similar farmer(s) by name or mobile number
                </p>

                <p className="text-[12px] font-medium text-[#9C5B14]/70 leading-tight">
                  Is this a different person, or the same farmer being
                  re-registered by mistake?
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {similarFarmers.map((f) => (
                <div
                  key={f._id}
                  className="bg-white rounded-xl p-3 border border-[#F5D0A9]/40 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[14px] text-[#1F2A22]">
                      {f.fullName}
                    </p>

                    <p className="text-[12px] font-medium text-[#1F2A22]/50">
                      {f.mobile}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-[#D97706] bg-[#FFF8ED] px-2 py-1 rounded-md border border-[#FDE6CD]">
                    {f.farmerCode}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSimilarFarmers(null)}
                className="flex-[1] bg-white border border-[#F5D0A9] text-[#9C5B14] rounded-xl py-2.5 font-bold text-[13px] active:bg-[#FFF8ED] transition-colors"
              >
                Check Again
              </button>

              <button
                type="button"
                onClick={handleConfirmProceed}
                className="flex-[1.5] bg-[#D97706] text-white rounded-xl py-2.5 font-bold text-[13px] shadow-sm active:scale-[0.98] transition-all"
              >
                Different Person — Continue
              </button>
            </div>
          </div>
        )}

      {/* Action Buttons */}
      {!similarFarmers && (
        <div className="flex gap-3 pt-6 mt-2 border-t border-black/[0.04]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-white border border-black/10 text-[#1F2A22] rounded-2xl py-3.5 font-bold text-[15px] active:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-[1.5] text-white rounded-2xl py-3.5 font-bold text-[15px] shadow-sm active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #4C9A5A 0%, #3B7A46 100%)",
            }}
          >
            {loading ? "Saving..." : isEditMode ? "Save Changes" : "Register Farmer"}
          </button>
        </div>
      )}
    </form>
  );
}