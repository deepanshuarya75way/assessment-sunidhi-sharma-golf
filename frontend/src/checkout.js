import { supabase } from "./supabaseClient";

const API = process.env.REACT_APP_API_URL;

export async function startCheckout({ planType, charityId, percent }) {
  if (!planType) throw new Error("Please select a plan.");
  if (!charityId) throw new Error("Please select a charity.");

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
console.log(session)
  if (sessionError || !session?.user?.id || !session.user.email) {
    throw new Error("Please log in or create an account before subscribing.");
  }

  let res;
  try {
    res = await fetch(`${API}/api/payments/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        planType,
        charityId,
        percent: Number(percent),
        userId: session.user.id,
        email: session.user.email,
      }),
    });
  } catch (err) {
    throw new Error(
      "Could not connect to the payment server. Please try again.",
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.url) {
    throw new Error(
      data.error || "Checkout could not be started. Please try again.",
    );
  }

  window.location.href = data.url;
}