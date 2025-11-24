import axios from "axios";

export async function POST(req: Request) {
  try {
    const { phone, name, project } = await req.json();

    // Validate environment variables
    const baseUrl = process.env.BITRIX_BASE_URL;
    const userId = process.env.BITRIX_USER_ID;
    const webhookKey = process.env.BITRIX_WEBHOOK_KEY;

    if (!baseUrl || !userId || !webhookKey) {
      return new Response(
        JSON.stringify({ error: "Missing Bitrix environment variables" }),
        { status: 500 },
      );
    }

    // Construct the URL properly
    const url = `${baseUrl}/rest/${userId}/${webhookKey}/crm.lead.add.json`;

    // Prepare the data for the request
    const data = {
      Fields: {
        PHONE: [{ VALUE: phone, VALUE_TYPE: "MOBILE" }],
        NAME: name,
        UF_CRM_1718281646: project,
        SOURCE_ID: "WEB",
      },
    };

    // Make the request to Bitrix CRM
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return new Response(JSON.stringify(response.data), { status: 200 });
  } catch (error: any) {
    console.error("Bitrix API Error:", error.response?.data || error.message);
    return new Response(
      JSON.stringify({
        error: "Failed to send callback request",
        details: error.response?.data || error.message,
      }),
      { status: 500 },
    );
  }
}
