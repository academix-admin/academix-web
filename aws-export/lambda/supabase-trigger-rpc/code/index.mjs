export const handler = async (event) => {
  try {
    console.log('Processed payload:', event);

    const { uri, headers, args } = event;

    if (!uri) {
      throw new Error('Missing required field: uri');
    }

    // Debugging: Log individual components
    console.log('Dispatching to URI:', uri);
    console.log('With headers:', headers);
    console.log('With args:', args);

    // Try the fetch with await so errors propagate
    const response = await fetch(uri, {
      method: 'POST',
      headers: headers || {},
      body: JSON.stringify(args || {}),
    });

    const responseBody = await response.text();
    console.log('Supabase RPC response status:', response.status);
    console.log('Supabase RPC response body:', responseBody);

    return {
      statusCode: 202,
      body: JSON.stringify({ message: 'RPC dispatched' }),
    };
  } catch (err) {
    console.error('Invalid request:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message || 'Bad Request' }),
    };
  }
};
