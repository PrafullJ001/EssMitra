import { useState } from "react";
import { buildReminderMessage } from "../../utils/messageTemplates";
import { buildStatementLink } from "../../utils/statementLink";
import SendMessageButtons from "../common/SendMessageButtons";

export default function ReminderButton({ farmer, totals }) {
  const [open, setOpen] = useState(false);

  const messageWithLink = `${buildReminderMessage(farmer, totals)}\n\n📄 खाते तपशील पहा: ${buildStatementLink(farmer)}`;

  return (
    <div>
      {/* Trigger — same size/weight family as the other action buttons
          (Clear All Pending / Record Payment), icon-led, compact for
          mobile. Chevron rotates to show expanded/collapsed state. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full mt-2 flex items-center justify-center gap-1.5 bg-[#E9F3E9]/70 hover:bg-[#E9F3E9] active:scale-[0.98] border border-[#4C9A5A]/20 text-[#2B5439] rounded-xl py-2.5 text-[12.5px] font-bold transition-all"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Send Payment Reminder
        <svg
          viewBox="0 0 24 24"
          className={`w-3 h-3 text-[#2B5439]/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Reveal panel — softer card treatment (border + subtle shadow
          instead of a flat fill) with a smooth expand/fade instead of an
          instant toggle. Same SendMessageButtons component/props as
          before — nothing about how the message is sent changed. */}
      {open && (
        <div className="mt-2.5 bg-white rounded-2xl border border-[#4C9A5A]/15 shadow-sm p-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] font-bold text-[#1F2A22]/40 uppercase tracking-wide mb-2.5">
            Send Via
          </p>
          <SendMessageButtons mobile={farmer.mobile} message={messageWithLink} />
        </div>
      )}
    </div>
  );
}