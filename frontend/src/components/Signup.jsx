import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import Pricing from "./Pricing";
import { supabase } from "../supabaseClient";
import { startCheckout } from "../checkout";

const API = process.env.REACT_APP_API_URL;

const Signup = ({ plan }) => {
  const location = useLocation();
  const initialPlan = plan || location.state?.plan || "monthly";

  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(plan || location.state?.plan ? 2 : 1);
  const [formData, setFormData] = useState({
    email: "",
    plan: initialPlan,
    charityId: "",
    percent: 10,
    password: "",
  });
  const [hasSession, setHasSession] = useState(false);
  const [charitiesError, setCharitiesError] = useState("");

  // Prefill the account email from the logged-in session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setHasSession(true);
        setFormData((f) => ({ ...f, email: session.user.email }));
      }
    });
  }, []);

  useEffect(() => {
    fetch(`${API}/api/charities`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) {
          throw new Error(data?.error || "Invalid response");
        }
        setCharities(data);
        if (data.length === 0) setCharitiesError("No charities available yet.");
      })
      .catch((err) => {
        console.error("Error fetching charities:", err);
        setCharitiesError(
          "Could not load charities. Check that the backend is running and REACT_APP_API_URL is correct.",
        );
      });
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.charityId) {
      return setError("Please select a charity first.");
    }

    setLoading(true);
    try {
      // New visitors: create the account (or sign in) before checkout
      if (!hasSession) {
        const email = formData.email.trim();
        if (!email) throw new Error("Please enter your email.");
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        const { data: up, error: upErr } = await supabase.auth.signUp({
          email,
          password: formData.password,
        });
        if (upErr && !/already registered/i.test(upErr.message)) throw upErr;

        if (!up?.session) {
          const { error: inErr } = await supabase.auth.signInWithPassword({
            email,
            password: formData.password,
          });
          if (inErr) {
            throw new Error(
              /confirm/i.test(inErr.message)
                ? "Please confirm your email, then log in and try again."
                : "Could not sign you in. Check your email and password.",
            );
          }
        }
      }

      // Redirects to Stripe only on success; throws with a clear message otherwise
      await startCheckout({
        planType: formData.plan,
        charityId: formData.charityId,
        percent: formData.percent,
      });
    } catch (err) {
      console.error("Signup failed", err);
      setError(err.message || "Checkout could not be started.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#020617] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full -top-24 -left-24 pointer-events-none" />

      <div className="text-center mb-10 z-10">
        <h2 className="text-5xl font-black text-white mb-3 tracking-tight">
          {step === 1 ? "Choose Your " : "Finalize Your "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent italic tracking-tighter">
            {step === 1 ? "IMPACT" : "DETAILS"}
          </span>
        </h2>
        <p className="text-slate-400 font-medium max-w-md mx-auto">
          {step === 1
            ? "Select a plan to start fueling change through the game you love."
            : "Tell us who you're playing for and confirm your contribution."}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl z-10"
          >
            <Pricing
              selectedPlan={formData.plan}
              onPlanChange={(p) => {
                setFormData({ ...formData, plan: p });
                setStep(2);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full p-10 bg-slate-900/50 backdrop-blur-2xl rounded-[3rem] border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10"
          >
            <form onSubmit={handleSignup} className="space-y-8">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-medium">
                  {error}{" "}
                  {/log in|account/i.test(error) && (
                    <Link to="/login" className="underline font-bold">
                      Log in
                    </Link>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-2 uppercase tracking-[0.2em]">
                  Account Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  readOnly={hasSession}
                  className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-white transition-all placeholder:text-slate-600"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {!hasSession && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-2 uppercase tracking-[0.2em]">
                    Password
                  </label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    placeholder="Create a password (min 6 characters)"
                    value={formData.password}
                    className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-white transition-all placeholder:text-slate-600"
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-2 uppercase tracking-[0.2em]">
                  Select Charity
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.charityId}
                    className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-2xl outline-none focus:border-cyan-500 text-white transition-all appearance-none cursor-pointer"
                    onChange={(e) =>
                      setFormData({ ...formData, charityId: e.target.value })
                    }
                  >
                    <option value="" className="bg-slate-900 text-slate-500">
                      Choose a Charity to Support
                    </option>
                    {charities.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-slate-900 text-white"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    ▼
                  </div>
                </div>
                {charitiesError && (
                  <p className="text-xs text-red-400 ml-2">{charitiesError}</p>
                )}
              </div>

              <div className="p-6 bg-slate-950/50 rounded-3xl border border-slate-800/50">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em]">
                    Your Donation %
                  </label>
                  <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {formData.percent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={formData.percent}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      percent: Number(e.target.value),
                    })
                  }
                />
                <div className="flex justify-between mt-3">
                  <span className="text-[10px] text-slate-600 font-bold uppercase">
                    Min (10%)
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold uppercase">
                    Max (100%)
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-8 py-4 bg-slate-800/50 text-slate-300 font-bold rounded-2xl hover:bg-slate-800 hover:text-white transition-all"
                >
                  Back
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 py-4 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black rounded-2xl hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Get Started"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Signup;