import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contactId, emailType } = await req.json();

    if (!contactId) {
      return new Response(JSON.stringify({ error: "Contact ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user's tenant_id
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant_id from profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;
    const senderName = profile.full_name || "Sales Team";

    // Fetch contact details
    const { data: contact, error: contactError } = await supabaseClient
      .from("contacts")
      .select("*")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .single();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch associated deals
    const { data: deals } = await supabaseClient
      .from("deals")
      .select("title, stage, value, expected_close_date, created_at, updated_at")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(5);

    // Fetch recent activities for this contact
    const { data: activities } = await supabaseClient
      .from("activities")
      .select("activity_type, title, is_completed, due_date, created_at")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build context for AI
    const contactContext = {
      name: `${contact.first_name} ${contact.last_name}`,
      firstName: contact.first_name,
      email: contact.email,
      company: contact.company,
      jobTitle: contact.job_title,
      deals: (deals || []).map(d => ({
        title: d.title,
        stage: d.stage,
        value: d.value,
        expectedCloseDate: d.expected_close_date,
        daysSinceUpdate: Math.floor((Date.now() - new Date(d.updated_at || d.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      recentActivities: (activities || []).map(a => ({
        type: a.activity_type,
        title: a.title,
        completed: a.is_completed,
        date: a.created_at
      })),
      senderName
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailTypePrompts: Record<string, string> = {
      follow_up: "a professional follow-up email to check in and maintain the relationship",
      proposal: "a proposal introduction email to present your solution or offer",
      meeting_request: "a meeting request email to schedule a call or meeting",
      thank_you: "a thank you email expressing gratitude for their time or business",
      re_engagement: "a re-engagement email to reconnect with a contact who has gone quiet",
    };

    const emailTypeDescription = emailTypePrompts[emailType] || emailTypePrompts.follow_up;

    const systemPrompt = `You are an expert sales copywriter who creates personalized, professional email drafts.
Your emails are:
- Warm and professional but not overly formal
- Personalized based on the contact's details and history
- Clear with a specific call-to-action
- Concise (under 200 words)
- Written in a conversational tone that builds rapport

Always use the contact's first name. Reference their company and any relevant deal/activity history naturally.`;

    const userPrompt = `Create ${emailTypeDescription} for this contact:

Contact Information:
- Name: ${contactContext.name}
- Company: ${contactContext.company || "Unknown"}
- Job Title: ${contactContext.jobTitle || "Unknown"}

${contactContext.deals.length > 0 ? `
Active Deals:
${contactContext.deals.map(d => `- "${d.title}" (Stage: ${d.stage}, Value: $${d.value || 0}, Last updated: ${d.daysSinceUpdate} days ago)`).join('\n')}
` : 'No active deals yet.'}

${contactContext.recentActivities.length > 0 ? `
Recent Activity History:
${contactContext.recentActivities.slice(0, 5).map(a => `- ${a.type}: "${a.title}" on ${new Date(a.date).toLocaleDateString()}`).join('\n')}
` : 'No recent activities logged.'}

The email should be signed by: ${contactContext.senderName}

Return your response as a JSON object with these fields:
- subject: A compelling email subject line
- body: The full email body (use \\n for line breaks)
- tips: An array of 2-3 tips for personalizing or improving the email`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the AI response
    let emailDraft = { subject: "", body: "", tips: [] as string[] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailDraft = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: use the raw content
        emailDraft = {
          subject: `Following up with ${contactContext.firstName}`,
          body: content,
          tips: ["Consider adding a personal touch", "Include a clear call-to-action"]
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      emailDraft = {
        subject: `Following up with ${contactContext.firstName}`,
        body: content,
        tips: ["Consider adding a personal touch", "Include a clear call-to-action"]
      };
    }

    console.log("Generated email draft for contact:", contactId);

    return new Response(JSON.stringify({ 
      draft: emailDraft,
      contact: {
        name: contactContext.name,
        email: contactContext.email
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate email draft error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
