import React, { useState } from "react";
import { useNotify } from "../components/Notifications";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import SEO from "../components/SEO";
import { Mail, Phone, MessageCircle, Loader2 } from "lucide-react";
import { triggerHaptic } from "../lib/haptics";

const ContactUs: React.FC = () => {
  const notify = useNotify();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      triggerHaptic("error");
      return notify("Please fill all fields", "error");
    }

    setLoading(true);
    triggerHaptic("medium");
    try {
      await addDoc(collection(db, "helpdesk"), {
        userId: auth.currentUser?.uid || "guest",
        userName: formData.name,
        userEmail: formData.email,
        subject: "Contact Us Inquiry",
        message: formData.message,
        status: "open",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      triggerHaptic("success");
      notify(
        "Your message has been sent successfully. We will get back to you soon.",
        "success",
      );
      setFormData({ name: "", email: "", message: "" });
    } catch (e) {
      triggerHaptic("error");
      notify("Failed to send message", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ds-apple-shop-canvas bg-[#F5F5F7] dark:bg-black min-h-screen pb-24">
      <SEO
        title="Contact Us | DEEP SHOP"
        description="Contact DEEP SHOP for inquiries, support, and help. Bangladesh's trusted platform for Border Cross Products + genuine mobiles."
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-6 text-center">
        <p className="ds-apple-eyebrow mb-1.5">Customer Care</p>
        <h1 className="ds-apple-display text-[24px] sm:text-[30px] leading-tight font-semibold text-[#1D1D1F] dark:text-white mb-2.5">
          Get in touch
        </h1>
        <p className="ds-apple-muted text-sm md:text-base max-w-md mx-auto leading-relaxed">
          We&apos;re here to help. Reach out for order inquiries, support, or general questions, and our team will get back to you shortly.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-2">
        <div className="grid md:grid-cols-[1fr_1fr] gap-5">
          {/* Contact Info Cards */}
          <div className="space-y-3.5">
            <a
              href="mailto:support@deepshop.com.bd"
              onClick={() => triggerHaptic("light")}
              className="ds-apple-surface p-5 rounded-[22px] hover:shadow-md active:scale-[0.99] transition-all flex items-start gap-4 group text-left block"
            >
              <div className="w-11 h-11 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white tracking-[-0.01em]">
                  Email Us
                </h4>
                <p className="text-xs ds-apple-muted mt-1 font-medium">
                  support@deepshop.com.bd
                </p>
              </div>
            </a>

            <a
              href="tel:+17247648185"
              onClick={() => triggerHaptic("light")}
              className="ds-apple-surface p-5 rounded-[22px] hover:shadow-md active:scale-[0.99] transition-all flex items-start gap-4 group text-left block"
            >
              <div className="w-11 h-11 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white tracking-[-0.01em]">
                  Call Us
                </h4>
                <p className="text-xs ds-apple-muted mt-1 font-medium tabular-nums">
                  +1 (724) 764-8185 (10 AM to 10 PM)
                </p>
              </div>
            </a>

            <a
              href="https://wa.me/17247648185"
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic("light")}
              className="ds-apple-surface p-5 rounded-[22px] hover:shadow-md active:scale-[0.99] transition-all flex items-start gap-4 group text-left block"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[15px] text-[#1D1D1F] dark:text-white tracking-[-0.01em]">
                  WhatsApp
                </h4>
                <p className="text-xs ds-apple-muted mt-1 font-medium">
                  Message for quick support
                </p>
              </div>
            </a>
          </div>

          {/* Form */}
          <div className="ds-apple-surface rounded-[24px] p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold ds-apple-muted mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="ds-apple-input w-full rounded-2xl px-4 py-3 outline-none text-sm font-medium"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold ds-apple-muted mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="ds-apple-input w-full rounded-2xl px-4 py-3 outline-none text-sm font-medium"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold ds-apple-muted mb-1.5">
                  Message
                </label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="ds-apple-input w-full rounded-2xl px-4 py-3 outline-none text-sm font-medium h-32 resize-none"
                  placeholder="How can we help you?"
                />
              </div>
              <div className="pt-2">
                <button
                  disabled={loading}
                  type="submit"
                  className="ds-apple-btn-primary w-full h-12 px-5 rounded-full font-semibold text-sm whitespace-nowrap active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
