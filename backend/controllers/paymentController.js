require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const VALID_PLANS = ["monthly", "yearly"];

exports.createCheckoutSession = async (req, res) => {
  const { userId, email, planType, charityId, percent } = req.body || {};

  // Required subscriber information
  if (!userId || !email) {
    return res.status(400).json({
      error: "Your account details are missing. Please log in and try again.",
    });
  }

  if (!VALID_PLANS.includes(planType)) {
    return res.status(400).json({ error: "Please select a valid plan." });
  }

  if (!charityId) {
    return res.status(400).json({ error: "Please select a charity." });
  }

  const pct = Number(percent);
  if (!Number.isInteger(pct) || pct < 10 || pct > 100) {
    return res
      .status(400)
      .json({ error: "Contribution must be between 10% and 100%." });
  }

  const priceId =
    planType === "yearly"
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    return res.status(500).json({ error: "Plan pricing is not configured." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/dashboard?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/pricing?canceled=true`,
      // Stripe metadata values must be strings
      metadata: {
        userId: String(userId),
        charityId: String(charityId),
        charityPercent: String(pct),
        plan: planType,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe Session Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};