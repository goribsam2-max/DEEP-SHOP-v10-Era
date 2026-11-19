import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Ticket, Bell, Loader2 } from "lucide-react";
import { HelpTicket } from "../types";
import { useIllustrations } from "../lib/useIllustrations";
import { triggerHaptic } from "../lib/haptics";

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const illustrations = useIllustrations();

  useEffect(() => {
    const fetchTickets = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "helpdesk"),
          where("userId", "==", auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as HelpTicket))
          .sort((a, b) => b.createdAt - a.createdAt);
        setTickets(data);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      }
      setLoading(false);
    };

    fetchTickets();
  }, []);

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="ds-apple-eyebrow mb-1.5">Help Desk</p>
            <h1 className="ds-apple-display text-[22px] sm:text-[28px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-1.5">
              My Support Tickets
            </h1>
            <p className="ds-apple-muted text-sm max-w-md">
              View and track your support inquiries.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              navigate("/help-center");
            }}
            className="ds-apple-btn-secondary h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Live Chat
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-2">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="ds-apple-surface rounded-[24px] p-10 text-center">
            {illustrations.emptyTickets ? (
              <div className="w-44 h-44 mx-auto mb-4 rounded-[20px] overflow-hidden">
                <img
                  src={illustrations.emptyTickets}
                  alt="No Tickets"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="w-7 h-7" />
              </div>
            )}
            <h3 className="font-semibold text-base text-[#1D1D1F] dark:text-white mb-1.5">
              No tickets yet
            </h3>
            <p className="text-sm ds-apple-muted mb-6">
              You haven&apos;t submitted any support requests.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/help-center");
              }}
              className="ds-apple-btn-primary font-semibold px-6 py-2.5 rounded-full text-sm whitespace-nowrap cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  navigate(`/ticket/${ticket.id}`);
                }}
                className="ds-apple-surface w-full text-left rounded-[22px] p-5 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all group flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <h4 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white truncate">
                      {ticket.subject}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight whitespace-nowrap shrink-0 ${
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
                  <p className="text-sm ds-apple-muted line-clamp-1 mb-2">
                    {ticket.message}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-medium ds-apple-muted tabular-nums">
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    {ticket.adminReply && !ticket.viewedByUser && (
                      <span className="inline-flex items-center gap-1 text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full font-semibold">
                        <Bell className="w-3 h-3" /> New Reply
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8E8E93] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
