# Video Synthesis Feature

## Overview
The video synthesis feature automatically generates and sends AI-generated video responses when Gary doesn't reply to a direct message within 10 seconds. This feature utilizes HeyGen's platform with Gary's custom avatar, maintaining Gary's authentic voice and personality.

## Core Requirements
- Trigger: No reply from Gary within 10 seconds in a DM
- Platform: HeyGen API integration
- Avatar: Gary's pre-configured custom avatar
- Delivery: Video message sent as an attachment in the chat
- Rate Limit: Maximum one video per hour
- Duration: Maximum 30 seconds per video

## Personality Framework
The video responses should reflect Gary's authentic voice and values:

### Core Traits
- Optimistic and forward-thinking
- Focused on human and planetary flourishing
- Technical yet accessible communication style
- Blend of engineer, educator, and community builder
- Passionate about foundational technology and innovation

### Communication Style
- Direct and clear communication
- Balance of technical expertise and approachability
- Emphasis on building genuine connections
- Infusion of optimism and possibility
- Focus on practical solutions and impact

## Technical Implementation

### Message Context Analysis
1. Search and analyze:
   - Current DM channel context
   - Related space channels for context
   - Previous interactions and themes
2. Weight heavily toward the incoming message content
3. Generate contextually relevant responses

### Conditions for Video Synthesis
1. Message must be in a DM channel with Gary
2. No reply from Gary within 10 seconds
3. No other video synthesis within the last hour
4. Video synthesis should only work for Gary's responses

### HeyGen Integration
- Using HeyGen's Template API for generation
- Template-based approach for richer content customization
- Custom avatar configuration pre-loaded with Gary's likeness

### Process Flow
1. User sends DM to Gary
2. System starts 10-second countdown
3. Check last video synthesis timestamp
4. If conditions met:
   - Analyze message context
   - Generate contextual script (max 30 seconds)
   - Generate video via HeyGen API
   - Attach video to chat via MessageItem
   - Send as a message from Gary's account

## Script Generation System Prompt
```
You are Gary Sheng, a Forbes 30 Under 30 technologist and creator focused on building tools and systems for human flourishing. Your communication style is:

1. AUTHENTIC: Speak as a technical expert who makes complex ideas accessible
2. OPTIMISTIC: Frame challenges as opportunities for innovation
3. PURPOSEFUL: Connect responses to larger mission of human/planetary flourishing
4. PRACTICAL: Provide clear, actionable insights and solutions
5. ENGAGING: Balance technical depth with approachability
6. CONTEXTUAL: Reference relevant previous discussions and shared context

Maintain these principles while crafting responses that are:
- Maximum 30 seconds in length
- Directly relevant to the incoming message
- Infused with personal warmth and technical credibility
- Focused on moving conversations forward constructively
```

## API Integration Points

### HeyGen Template API Flow
1. Create template through HeyGen interface
2. Retrieve template ID via API
3. Modify template elements for each response
4. Generate video using template
5. Monitor video status until complete
6. Retrieve final video URL for attachment

### Required API Endpoints
- Template listing: `GET /v2/templates`
- Template retrieval: `GET /v2/template/<template_id>`
- Video generation: `POST /v2/template/<template_id>/generate`
- Video status check: `GET /v1/video_status.get`

## Security Considerations
- API key management
- Authentication for video sending
- Rate limiting for video generation (1 per hour)
- Temporary URL handling (7-day expiration)

## Future Enhancements
- Extend to other users (pending)
- Multiple template support
- Enhanced context analysis
- Fallback mechanisms for API failures 