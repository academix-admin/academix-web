// import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// const scheduler = new SchedulerClient({});

// export const handler = async (event) => {
//     try {
//         console.log("Recieved Event",event);
//         const body = JSON.parse(event.body);
//         const { pools_id, utc_execution_time, task } = body.record;

//         if (!pools_id || !utc_execution_time || !task) {
//             return { statusCode: 400, body: JSON.stringify({ error: "Missing required record" }) };
//         }
        
//         // Validate the date format
//         let executionDate;
//         try {
//             executionDate = new Date(utc_execution_time);
            
//             // Check if the date is invalid
//             if (isNaN(executionDate.getTime())) {
//                 throw new Error("Invalid date format");
//             }
//         } catch (error) {
//             return { 
//                 statusCode: 400, 
//                 body: JSON.stringify({ 
//                     error: "Invalid execution time format", 
//                     details: error.message,
//                     expected_format: "ISO 8601 (e.g., '2023-12-31T23:59:59Z' or '2023-12-31T23:59:59+00:00')"
//                 }) 
//             };
//         }
        
//         const nowTime = Date.now();
//         const oneMinuteInMs = 60 * 1000;
//         const minExecutionTime = nowTime + oneMinuteInMs;
        
//         // Timezone handling - convert to UTC for consistent comparison
//         const executionTimeUtc = executionDate.getTime();
        
//         // if (executionTimeUtc < minExecutionTime) {
//         //     // Adjust to 1 minute from now if execution time is too soon
//         //     executionDate = new Date(minExecutionTime);
//         //     console.log(`Adjusted execution time to ${executionDate.toISOString()}`);
//         // }
        
//         const executionTime = executionDate.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS

//         console.log(executionTime);
//         const shortPoolsId = pools_id.length > 10 ? pools_id.substring(0, 10) : pools_id;
//         const scheduleName = `PoolJob-${pools_id}-${Date.now()}`;


//         const jobData = { "body":{
//             pools_id, previous_task: task 
//         }};

//         const scheduleParams = new CreateScheduleCommand({
//             Name: scheduleName, 
//             FlexibleTimeWindow: { Mode: "OFF" },
//             GroupName: "pools_scheduler",
//             State: "ENABLED",
//             Target: {
//                 Arn: process.env.TARGET_LAMBDA_ARN, 
//                 RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
//                 Input: JSON.stringify(jobData),
//             },
//             ScheduleExpression: `at(${executionTime})`,
//             ScheduleExpressionTimezone: "UTC",
//             ActionAfterCompletion: "DELETE",
//         });

//         const scheduleResponse = await scheduler.send(scheduleParams);

//         return {
//             statusCode: 200,
//             body: JSON.stringify({ message: "Pool job scheduled successfully", pools_id, executionTime, scheduleResponse}),
//         };
//     } catch (err) {
//         console.error("Error scheduling job:", err);
//         return { statusCode: 500, body: JSON.stringify({ error: "Failed to schedule job" }) };
//     }
// };
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { createClient } from "@supabase/supabase-js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const scheduler = new SchedulerClient({});
const lambda = new LambdaClient({});

export const handler = async (event) => {
    try {
        console.log("Received Event", event);
        const body = JSON.parse(event.body);
        const { pools_id, utc_execution_time, task } = body.record;

        if (!pools_id || !utc_execution_time || !task) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing required record" }) };
        }
        
        // Validate the date format
        let executionDate;
        try {
            executionDate = new Date(utc_execution_time);
            
            // Check if the date is invalid
            if (isNaN(executionDate.getTime())) {
                throw new Error("Invalid date format");
            }
        } catch (error) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ 
                    error: "Invalid execution time format", 
                    details: error.message,
                    expected_format: "ISO 8601 (e.g., '2023-12-31T23:59:59Z' or '2023-12-31T23:59:59+00:00')"
                }) 
            };
        }
        
        const nowTime = Date.now();
        const oneMinuteInMs = 60 * 1000;
        const minExecutionTime = nowTime + oneMinuteInMs;
        
        // Timezone handling - convert to UTC for consistent comparison
        const executionTimeUtc = executionDate.getTime();
        
        // Check if execution time is less than 1 minute away
        const timeUntilExecution = executionTimeUtc - nowTime;
        
        if (timeUntilExecution <= oneMinuteInMs) {
            // Calculate delay if needed (minimum 0)
            const delayMs = Math.max(0, timeUntilExecution);
            
            console.log(`Execution time is within 1 minute (${timeUntilExecution}ms away). Delaying for ${delayMs}ms then invoking Lambda directly.`);
            
            // Wait for the calculated delay
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            // Invoke the Lambda function directly
            const jobData = {
                body: {
                    pools_id,
                    previous_task: task
                }
            };
            
            const invokeCommand = new InvokeCommand({
                FunctionName: process.env.TARGET_LAMBDA_ARN,
                InvocationType: "Event", // Asynchronous invocation
                Payload: Buffer.from(JSON.stringify(jobData))
            });
            
            await lambda.send(invokeCommand);
            
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    message: "Pool job executed directly due to short time window", 
                    pools_id, 
                    executionTime: executionDate.toISOString(),
                    delay_applied_ms: delayMs,
                    execution_type: "direct_invoke"
                }),
            };
        }
        
        // For execution times beyond 1 minute, proceed with scheduling
        const executionTime = executionDate.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
        console.log(executionTime);
        
        const scheduleName = `PoolJob-${pools_id}-${Date.now()}`;

        const jobData = {
            body: {
                pools_id, 
                previous_task: task 
            }
        };

        const scheduleParams = new CreateScheduleCommand({
            Name: scheduleName, 
            FlexibleTimeWindow: { Mode: "OFF" },
            GroupName: "pools_scheduler",
            State: "ENABLED",
            Target: {
                Arn: process.env.TARGET_LAMBDA_ARN, 
                RoleArn: process.env.EVENTBRIDGE_ROLE_ARN,
                Input: JSON.stringify(jobData),
            },
            ScheduleExpression: `at(${executionTime})`,
            ScheduleExpressionTimezone: "UTC",
            ActionAfterCompletion: "DELETE",
        });

        const scheduleResponse = await scheduler.send(scheduleParams);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "Pool job scheduled successfully", 
                pools_id, 
                executionTime, 
                scheduleResponse,
                execution_type: "scheduled"
            }),
        };
    } catch (err) {
        console.error("Error scheduling job:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Failed to schedule job" }) };
    }
};