export default function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const rawCountry = request.headers["x-vercel-ip-country"] || request.headers["cf-ipcountry"] || "";
  const country = String(Array.isArray(rawCountry) ? rawCountry[0] : rawCountry).trim().toUpperCase();
  return response.status(200).json({
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    locale: country === "BR" ? "pt-BR" : country ? "en" : null,
  });
}
