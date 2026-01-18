import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "deal_update" | "activity_reminder" | "team_update";
  recipientEmail: string;
  recipientName: string;
  subject: string;
  data: Record<string, unknown>;
}

const getEmailTemplate = (
  type: string,
  recipientName: string,
  data: Record<string, unknown>
): string => {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #333;
  `;

  switch (type) {
    case "deal_update":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #7c3aed;">Deal Update</h1>
          <p>Hi ${recipientName},</p>
          <p>There's an update on a deal you're tracking:</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Deal:</strong> ${data.dealTitle || "N/A"}</p>
            <p><strong>Stage:</strong> ${data.stage || "N/A"}</p>
            <p><strong>Value:</strong> $${data.value || 0}</p>
            ${data.message ? `<p><strong>Note:</strong> ${data.message}</p>` : ""}
          </div>
          <p>Best regards,<br>Your CRM Team</p>
        </div>
      `;

    case "activity_reminder":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #2563eb;">Activity Reminder</h1>
          <p>Hi ${recipientName},</p>
          <p>You have an upcoming activity that needs your attention:</p>
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Activity:</strong> ${data.title || "N/A"}</p>
            <p><strong>Type:</strong> ${data.activityType || "N/A"}</p>
            <p><strong>Due:</strong> ${data.dueDate || "N/A"}</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ""}
          </div>
          <p>Don't forget to mark it complete when done!</p>
          <p>Best regards,<br>Your CRM Team</p>
        </div>
      `;

    case "team_update":
      return `
        <div style="${baseStyle}">
          <h1 style="color: #16a34a;">Team Update</h1>
          <p>Hi ${recipientName},</p>
          <p>There's been a change to your team:</p>
          <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Member:</strong> ${data.memberName || "N/A"}</p>
            <p><strong>Action:</strong> ${data.action || "N/A"}</p>
            ${data.role ? `<p><strong>Role:</strong> ${data.role}</p>` : ""}
          </div>
          <p>Best regards,<br>Your CRM Team</p>
        </div>
      `;

    default:
      return `
        <div style="${baseStyle}">
          <h1>Notification</h1>
          <p>Hi ${recipientName},</p>
          <p>${JSON.stringify(data)}</p>
          <p>Best regards,<br>Your CRM Team</p>
        </div>
      `;
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Notification function called with method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, subject, data }: NotificationRequest =
      await req.json();

    console.log(`Sending ${type} notification to ${recipientEmail}`);

    if (!recipientEmail || !type) {
      throw new Error("Missing required fields: recipientEmail and type are required");
    }

    const html = getEmailTemplate(type, recipientName || "there", data || {});

    const emailResponse = await resend.emails.send({
      from: "LunarAI CRM <notifications@lunarai.agency>",
      to: [recipientEmail],
      subject: subject || `CRM Notification: ${type.replace("_", " ")}`,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-notification function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
