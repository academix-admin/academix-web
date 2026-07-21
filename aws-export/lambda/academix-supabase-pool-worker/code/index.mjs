import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (event) => {
    console.log("Received Event:", JSON.stringify(event, null, 2));


    // Extract values 
    const { pools_id, previous_task } = event.body;

    if (!pools_id || !previous_task) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    try {

        const { data: updateData, error } = await supabase.rpc('update_pool_status', { p_pools_id: pools_id, p_previous_task: previous_task });

        if (error) {
            console.error(`Failed to update Supabase: ${error.message}`);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: error.message }),
            };
        }

        console.log(`Updated pool status for pool ID: ${pools_id}`);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Pool updated successfully' }),
        };
    } catch (error) {
        console.error("Failed to process job:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
