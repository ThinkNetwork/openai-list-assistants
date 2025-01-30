window.function = async function(api_key, order, limit) {
    // Validate API Key
    if (!api_key.value) {
        return "Error: OpenAI API Key is required.";
    }

    // Set default values for optional parameters
    const orderValue = order.value || "desc"; // Default: descending order
    const limitValue = limit.value ? parseInt(limit.value) : 20; // Default: 20

    // Validate limit
    if (isNaN(limitValue) || limitValue < 1) {
        return "Error: Limit must be a positive integer.";
    }

    // Construct query parameters
    const queryParams = new URLSearchParams({
        order: orderValue,
        limit: limitValue.toString()
    });

    // API endpoint URL
    const apiUrl = `https://api.openai.com/v1/assistants?${queryParams.toString()}`;

    // Make the API request
    try {
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key.value}`,
                "OpenAI-Beta": "assistants=v2"
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            return `Error ${response.status}: ${errorData.error?.message || "Unknown error"}`;
        }

        // Parse and return the response
        const responseData = await response.json();
        return JSON.stringify(responseData, null, 2);

    } catch (error) {
        return `Error: Request failed - ${error.message}`;
    }
};
