import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { 
      name, 
      phone, 
      project_name,
      utm_source, 
      utm_medium, 
      utm_campaign, 
      utm_content, 
      utm_term 
    } = await req.json();

    const params = new URLSearchParams({
      "FIELDS[PHONE][0][VALUE]": phone,
      "FIELDS[PHONE][0][VALUE_TYPE]": "MOBILE",
      "FIELDS[NAME]": name,
      "FIELDS[SOURCE_ID]": "STORE",
    });

    
    if (project_name && project_name.trim() !== "") {
      params.append("FIELDS[UF_CRM_1718281646]", project_name.trim());
    }

    // Add UTM parameters to Bitrix24 fields if provided
    if (utm_source) {
      params.append("FIELDS[UTM_SOURCE]", utm_source);
    }
    if (utm_medium) {
      params.append("FIELDS[UTM_MEDIUM]", utm_medium);
    }
    if (utm_campaign) {
      params.append("FIELDS[UTM_CAMPAIGN]", utm_campaign);
    }
    if (utm_content) {
      params.append("FIELDS[UTM_CONTENT]", utm_content);
    }
    if (utm_term) {
      params.append("FIELDS[UTM_TERM]", utm_term);
    }

    const url = `https://crm.galamat.kz/rest/25451/see0f8hgdnl3zme4/crm.lead.add.json?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: text }, { status: 500 });
    }

    const data = await res.json();

    console.log("Full request body:", { name, phone, project_name, utm_source, utm_medium, utm_campaign, utm_content, utm_term });
    console.log("Final Bitrix24 URL params:", params.toString());
    console.log("Bitrix24 response:", data);

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
