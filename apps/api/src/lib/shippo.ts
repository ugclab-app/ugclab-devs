const SHIPPO_API = "https://api.goshippo.com";

export function isShippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY?.trim());
}

type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  email?: string;
};

export async function createShippoLabel(params: {
  from: ShippoAddress;
  to: ShippoAddress;
  weightGrams: number;
}): Promise<{ trackingNumber: string; labelUrl: string; carrier: string }> {
  const token = process.env.SHIPPO_API_KEY?.trim();
  if (!token) throw new Error("SHIPPO_API_KEY is not configured");

  const weightLb = Math.max(0.1, params.weightGrams / 453.592);
  const parcel = {
    length: "6",
    width: "4",
    height: "2",
    distance_unit: "in",
    weight: String(weightLb.toFixed(2)),
    mass_unit: "lb",
  };

  const shipmentRes = await fetch(`${SHIPPO_API}/shipments/`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: params.from,
      address_to: params.to,
      parcels: [parcel],
      async: false,
    }),
  });

  const shipment = (await shipmentRes.json()) as {
    rates?: { object_id: string; provider: string; amount: string }[];
    messages?: { text: string }[];
  };

  if (!shipmentRes.ok) {
    const msg = shipment.messages?.[0]?.text ?? "Shippo shipment failed";
    throw new Error(msg);
  }

  const rate = shipment.rates?.[0];
  if (!rate) throw new Error("No shipping rates returned from Shippo");

  const txRes = await fetch(`${SHIPPO_API}/transactions/`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rate: rate.object_id,
      label_file_type: "PDF",
      async: false,
    }),
  });

  const tx = (await txRes.json()) as {
    status: string;
    tracking_number?: string;
    label_url?: string;
    messages?: { text: string }[];
  };

  if (!txRes.ok || tx.status !== "SUCCESS") {
    throw new Error(tx.messages?.[0]?.text ?? "Could not purchase label");
  }

  return {
    trackingNumber: tx.tracking_number ?? "",
    labelUrl: tx.label_url ?? "",
    carrier: rate.provider,
  };
}
