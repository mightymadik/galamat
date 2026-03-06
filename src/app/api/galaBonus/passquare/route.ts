"use server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const {
      phone,
      name,
      prize,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
    } = await req.json();

    // UTM коллаборации Gala Bonus (например, Dodo Pizza QR)
    const utm = {
      utm_source: utm_source ?? "dodo_pizza",
      utm_medium: utm_medium ?? "qr",
      utm_campaign: utm_campaign ?? "gala_bonus_collab",
      utm_content: utm_content ?? "offline_qr",
    };

    // Форматируем бонус как строку с двумя знаками после запятой
    const bonusString = prize.replace(/[^\d]/g, "") + ".00";

    // 1️⃣ Запрос в Passquare
    const { data } = await axios.post(
      "https://core.passquare.com/api/v2/crm/user_create_or_update",
      {
        app_key: process.env.PASSQUARE_APP_KEY,
        phone,
        name,
        bonus: bonusString,
        balance_extra: prize,
      }
    );

    // 2️⃣ Запрос в Bitrix
    try {
      await axios.get("https://crm.galamat.kz/services/webhooks/gen_link/index.php", {
        params: {
          name,
          phone,
          balance: prize,
          ...utm,
        },
      });
    } catch (bitrixErr) {
      console.error("BITRIX ERROR:", bitrixErr);
    }

    // Возвращаем результат клиенту
    return Response.json({
      success: true,
      card_url: data.card_url,
      card_gpay_url: data.card_gpay_url,
      user_hash: data.user_hash,
    });
  } catch (err: any) {
    console.error("PASSQUARE ERROR:", err?.response?.data || err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}