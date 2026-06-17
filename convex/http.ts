import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not set");
      return new Response("CLERK_WEBHOOK_SECRET not set in Convex environment", { status: 500 });
    }

    // headers 추출
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Svix 검증을 위해 반드시 원본 raw text body가 필요합니다.
    const body = await request.text();
    const webhook = new Webhook(webhookSecret);
    let evt: any;

    // webhook 서명 검증
    try {
      evt = webhook.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as any;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error verifying webhook", { status: 400 });
    }

    const eventType = evt.type;
    
    // user.created 와 user.updated 모두 동기화하도록 처리
    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;
      
      const email = email_addresses?.[0]?.email_address ?? "";
      if (!email) {
        return new Response("No email address provided", { status: 400 });
      }
      
      const name = `${first_name || ""} ${last_name || ""}`.trim() || username || email.split("@")[0] || "User";
      const userUsername = username || email.split("@")[0] || "user";

      try {
        // users.ts에 작성되어 있는 실제 Mutation 이름인 'createOrUpdateUserFromWebhook' 호출
        // 스키마 정의에 따라 'imageUrl' 대신 'image' 필드로 매핑
        await ctx.runMutation(api.users.createOrUpdateUserFromWebhook, {
          clerkId: id,
          email: email,
          username: userUsername,
          fullname: name,
          image: image_url ?? "",
        });
      } catch (error) {
        console.error("Error syncing user to database:", error);
        return new Response("Error syncing user to database", { status: 500 });
      }
    }
    
    return new Response("Webhook processed successfully", { status: 200 });
  }),
});

export default http;
