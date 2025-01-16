interface HeyGenTemplate {
  template_id: string;
  name: string;
  thumbnail_image_url: string;
}

interface HeyGenVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: {
    code: number;
    message: string;
    detail: string;
  };
}

interface HeyGenVariable {
  name: string;
  type: string;
  properties: {
    content?: string;
    [key: string]: string | undefined;
  };
}

export const heygenService = {
  async listTemplates(): Promise<HeyGenTemplate[]> {
    const response = await fetch('https://api.heygen.com/v2/templates', {
      headers: {
        'accept': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY || ''
      }
    });

    const data = await response.json();
    return data.data.templates;
  },

  async getTemplate(templateId: string) {
    const response = await fetch(`https://api.heygen.com/v2/template/${templateId}`, {
      headers: {
        'accept': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY || ''
      }
    });

    return response.json();
  },

  async generateVideo(templateId: string, variables: Record<string, HeyGenVariable>) {
    const response = await fetch(`https://api.heygen.com/v2/template/${templateId}/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.HEYGEN_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caption: false,
        title: 'Auto Response',
        variables
      })
    });

    const data = await response.json();
    return data.data.video_id;
  },

  async checkVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
    const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY || ''
      }
    });

    const data = await response.json();
    
    if (data.data.status === 'failed') {
      return {
        status: 'failed',
        error: data.data.error
      };
    }

    if (data.data.status === 'completed') {
      return {
        status: 'completed',
        video_url: data.data.video_url
      };
    }

    return {
      status: data.data.status === 'processing' ? 'processing' : 'pending'
    };
  }
}; 