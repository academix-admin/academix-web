export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));  // Log the event

  // TODO implement
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};
