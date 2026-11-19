import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { HelpTicket } from "../types";
import { useNotify } from "../components/Notifications";
import { Headphones, Clock, Smile, Frown } from "lucide-react";
import { OrderDetailPageSkeleton } from "../components/PageSkeletons";
import { triggerHaptic } from "../lib/haptics";

const TicketDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const [ticket, setTicket] = useState<HelpTicket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!id || !auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, "helpdesk", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as HelpTicket;
          setTicket(data);

          if (!data.viewedByUser && data.adminReply) {
            await updateDoc(doc(db, "helpdesk", id), { viewedByUser: true });
          }
        } else {
          notify("Ticket not found", "error");
          navigate("/help-center");
        }
      } catch (err) {
        console.error(err);
        notify("Error loading ticket", "error");
      }
      setLoading(false);
    };
    fetchTicket();
  }, [id, navigate, notify]);

  const handleFeedback = async (feedback: "Satisfied" | "Not Satisfied") => {
    if (!ticket) return;
    triggerHaptic(feedback === "Satisfied" ? "success" : "warning");
    try {
      await updateDoc(doc(db, "helpdesk", ticket.id), {
        feedback,
        updatedAt: Date.now(),
      });
      setTicket({ ...ticket, feedback });
      notify("Thank you for your feedback!", "success");
    } catch (e) {
      notify("Error submitting feedback", "error");
    }
  };

  if (loading) {
    return <OrderDetailPageSkeleton />;
  }

  if (!ticket) return null;

  return (
    <div className="ds-apple-shop-canvas min-h-screen bg-[#F5F5F7] dark:bg-black pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* User Original Request */}
        <div className="ds-apple-surface p-6 rounded-[24px]">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div className="min-w-0">
              <p className="ds-apple-eyebrow mb-1 tabular-nums">
                Ticket #{ticket.id.slice(0, 8)}
              </p>
              <h1 className="font-semibold text-[18px] sm:text-[21px] leading-snug tracking-[-0.015em] text-[#1D1D1F] dark:text-white mb-1">
                {ticket.subject}
              </h1>
              <p className="text-[11px] font-medium ds-apple-muted tabular-nums">
                {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                ticket.status === "Open"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : ticket.status === "Replied"
                  ? "bg-[#0071E3]/12 text-[#0071E3] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]"
                  : ticket.status === "Resolved"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-black/[0.06] dark:bg-white/[0.1] ds-apple-muted"
              }`}
            >
              {ticket.status}
            </span>
          </div>
          <div className="text-sm text-[#1D1D1F]/85 dark:text-[#F5F5F7]/85 leading-relaxed whitespace-pre-wrap">
            {ticket.message}
          </div>
        </div>

        {/* Admin Reply */}
        {ticket.adminReply ? (
          <div className="ds-apple-surface p-6 rounded-[24px]">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm tracking-[-0.01em] text-[#1D1D1F] dark:text-white">
                  Support Team
                </h3>
                <p className="text-[11px] font-medium ds-apple-muted tabular-nums">
                  {ticket.updatedAt
                    ? new Date(ticket.updatedAt).toLocaleString()
                    : "Recently"}
                </p>
              </div>
            </div>
            <div className="text-sm text-[#1D1D1F]/90 dark:text-[#F5F5F7]/90 leading-relaxed whitespace-pre-wrap mb-6">
              {ticket.adminReply}
            </div>

            {/* Feedback Section */}
            <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-5">
              <h4 className="ds-apple-eyebrow mb-3 text-center">
                How was our support?
              </h4>

              {ticket.feedback ? (
                <div className="text-center ds-apple-surface-subtle py-3 px-4 rounded-full">
                  <span className="text-xs font-semibold text-[#1D1D1F] dark:text-white inline-flex items-center gap-1.5">
                    You marked this as:
                    {ticket.feedback === "Satisfied" ? (
                      <Smile className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Frown className="w-4 h-4 text-[#FF3B30]" />
                    )}
                    {ticket.feedback}
                  </span>
                </div>
              ) : (
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => handleFeedback("Satisfied")}
                    className="ds-apple-btn-primary flex-1 h-11 px-4 rounded-full font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Smile className="w-4 h-4 shrink-0" /> Satisfied
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback("Not Satisfied")}
                    className="ds-apple-btn-secondary flex-1 h-11 px-4 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-full font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Frown className="w-4 h-4 shrink-0" /> Not Satisfied
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ds-apple-surface text-center py-12 px-6 rounded-[24px]">
            <div className="w-12 h-12 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center mx-auto mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white">
              Please Wait
            </p>
            <p className="text-xs mt-1.5 ds-apple-muted leading-relaxed max-w-[240px] mx-auto">
              Our support team is reviewing your ticket and will reply here
              soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;
