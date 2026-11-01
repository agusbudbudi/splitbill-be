const GA_COLLECT_URL = "https://www.google-analytics.com/mp/collect";

// Sends the GA4 `purchase` event through the Measurement Protocol. The webhook
// is the only place an order becomes paid, so this counts every payment even
// when the buyer already closed the payment page.
export async function sendPurchaseEvent(order) {
  const measurementId = process.env.GA_MEASUREMENT_ID;
  const apiSecret = process.env.GA_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn("GA_MEASUREMENT_ID or GA_API_SECRET is not configured. Skipping GA4 purchase event.");
    return;
  }

  const userId = String(order.userId);

  // Never log this URL: it carries the API secret
  const url = `${GA_COLLECT_URL}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(3000),
    body: JSON.stringify({
      client_id: order.gaClientId || userId,
      user_id: userId,
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: order.orderId,
            value: order.amount,
            currency: "IDR",
            plan_id: String(order.referenceId),
            items: [
              {
                item_id: String(order.referenceId),
                item_name: order.snapshot?.name,
                price: order.amount,
                quantity: 1,
              },
            ],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`GA4 Measurement Protocol returned status ${response.status}`);
  }
}
