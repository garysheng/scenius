export const heygenService = {
  async generateVideo(message: string, templateId?: string) {
    const defaultTemplateId = process.env.NEXT_PUBLIC_HEYGEN_TEMPLATE_ID;
    const finalTemplateId = templateId || defaultTemplateId;
    const apiKey = process.env.HEYGEN_API_KEY;

    if (!finalTemplateId || !apiKey) {
      throw new Error('Missing HeyGen configuration');
    }

    console.log('Starting video generation with:', {
      templateId: finalTemplateId,
      messageLength: message.length,
      hasApiKey: !!apiKey
    });

    // Generate video using template
    const generateResponse = await fetch(`https://api.heygen.com/v2/template/${finalTemplateId}/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caption: false,
        title: 'Scenius Chat Auto-Generated Video Message',
        dimension: {
          width: 1280,
          height: 720
        },
        variables: {
          script: {
            name: 'script',
            type: 'text',
            properties: {
              content: message
            }
          }
        }
      }),
    });

    const responseText = await generateResponse.text();
    console.log('Generate response:', {
      status: generateResponse.status,
      statusText: generateResponse.statusText,
      response: responseText
    });

    if (!generateResponse.ok) {
      throw new Error(`Failed to generate video: ${generateResponse.status} ${generateResponse.statusText} - ${responseText}`);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (responseData.error) {
      throw new Error(`API Error: ${JSON.stringify(responseData.error)}`);
    }

    const video_id = responseData.data?.video_id;
    if (!video_id) {
      throw new Error(`No video_id in response: ${responseText}`);
    }

    console.log('Video generation started:', { video_id });

    // Poll for video status
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes maximum (10 second intervals)
    
    while (attempts < maxAttempts) {
      console.log(`Checking status attempt ${attempts + 1}/${maxAttempts}`);
      
      const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/json',
        }
      });

      const statusText = await statusResponse.text();
      console.log('Status response:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        response: statusText
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check video status: ${statusResponse.status} ${statusResponse.statusText} - ${statusText}`);
      }

      let statusData;
      try {
        statusData = JSON.parse(statusText);
      } catch {
        throw new Error(`Invalid JSON response from status check: ${statusText}`);
      }

      if (statusData.error) {
        throw new Error(`Status API Error: ${JSON.stringify(statusData.error)}`);
      }

      const status = statusData.data?.status;
      const video_url = statusData.data?.video_url;
      console.log('Status check result:', { status, video_url });

      if (status === 'completed') {
        return { 
          success: true, 
          status: 'completed',
          video_url 
        };
      }

      if (status === 'failed') {
        const error = statusData.data?.error;
        if (error) {
          throw new Error(`Video generation failed: ${error.message} - ${error.detail}`);
        }
        throw new Error('Video generation failed');
      }

      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
    }

    throw new Error('Video generation timed out');
  }
}; 