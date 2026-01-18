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
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Fetch CRM data for analysis
    const [dealsResult, contactsResult, activitiesResult] = await Promise.all([
      supabaseClient
        .from("deals")
        .select("deal_id, title, stage, value, expected_close_date, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabaseClient
        .from("contacts")
        .select("contact_id, first_name, last_name, company, email, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabaseClient
        .from("activities")
        .select("activity_id, activity_type, title, is_completed, due_date, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const deals = dealsResult.data || [];
    const contacts = contactsResult.data || [];
    const activities = activitiesResult.data || [];

    // Build context for AI
    const crmContext = {
      deals: deals.map(d => ({
        title: d.title,
        stage: d.stage,
        value: d.value,
        expectedCloseDate: d.expected_close_date,
        daysSinceUpdate: Math.floor((Date.now() - new Date(d.updated_at || d.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      contacts: contacts.map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        company: c.company,
        hasEmail: !!c.email,
        daysSinceUpdate: Math.floor((Date.now() - new Date(c.updated_at || c.created_at).getTime()) / (1000 * 60 * 60 * 24))
      })),
      activities: activities.map(a => ({
        type: a.activity_type,
        title: a.title,
        isCompleted: a.is_completed,
        dueDate: a.due_date,
        isOverdue: a.due_date && !a.is_completed && new Date(a.due_date) < new Date()
      })),
      summary: {
        totalDeals: deals.length,
        dealsByStage: deals.reduce((acc, d) => {
          acc[d.stage] = (acc[d.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalContacts: contacts.length,
        pendingActivities: activities.filter(a => !a.is_completed).length,
        overdueActivities: activities.filter(a => a.due_date && !a.is_completed && new Date(a.due_date) < new Date()).length
      }
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an AI sales assistant for a CRM system. Analyze the provided CRM data and suggest the next best actions for the sales team.

Focus on:
1. Deals that need attention (stale deals, deals close to expected close date)
2. Contacts that haven't been engaged recently
3. Overdue or pending activities
4. Opportunities to move deals forward in the pipeline
5. Follow-up recommendations

Be specific, actionable, and prioritize by impact. Keep suggestions concise and practical.`;

    const userPrompt = `Here's the current CRM data:

${JSON.stringify(crmContext, null, 2)}

Based on this data, provide 3-5 prioritized "Next Best Action" suggestions. Each suggestion should:
- Be specific and actionable
- Reference actual data (deal names, contact names, etc.)
- Include the reasoning
- Have a priority level (high/medium/low)

Format your response as a JSON array with objects containing: action, target, reason, priority, category (one of: follow_up, deal_progress, outreach, task, opportunity)`;

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

    // Parse the AI response - extract JSON from the response
    let suggestions = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create a single suggestion from the text
        suggestions = [{
          action: content.substring(0, 200),
          target: "General",
          reason: "AI analysis",
          priority: "medium",
          category: "opportunity"
        }];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      suggestions = [{
        action: content.substring(0, 200),
        target: "General",
        reason: "AI analysis",
        priority: "medium",
        category: "opportunity"
      }];
    }

    console.log("Generated suggestions:", suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Next best action error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
