# @apertis/ai-sdk-provider

Apertis AI provider for the [Vercel AI SDK](https://sdk.vercel.ai/).

## Compatibility

- **AI SDK 5.0+** - Compatible with both AI SDK v5 and v6
- **Node.js 18+** - Minimum supported Node.js version
- **OpenCode, Kilo Code, Cursor** - Works with all AI coding tools built on the Vercel AI SDK

## Installation

```bash
npm install @apertis/ai-sdk-provider ai
```

## Setup

Set your API key as an environment variable:

```bash
export APERTIS_API_KEY=sk-your-api-key
```

Or pass it directly:

```typescript
import { createApertis } from '@apertis/ai-sdk-provider';

const apertis = createApertis({ apiKey: 'sk-your-api-key' });
```

## Usage

### Basic Text Generation

```typescript
import { apertis } from '@apertis/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: apertis('gpt-5.2'),
  prompt: 'Explain quantum computing in simple terms.',
});
```

### Streaming

```typescript
import { apertis } from '@apertis/ai-sdk-provider';
import { streamText } from 'ai';

const { textStream } = streamText({
  model: apertis('claude-sonnet-4-6'),
  prompt: 'Write a haiku about programming.',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### Tool Calling

```typescript
import { apertis } from '@apertis/ai-sdk-provider';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const { text } = await generateText({
  model: apertis('gpt-5.2'),
  tools: {
    weather: tool({
      description: 'Get weather for a location',
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => `Sunny, 22°C in ${location}`,
    }),
  },
  prompt: 'What is the weather in Tokyo?',
});
```

### Embeddings

```typescript
import { apertis } from '@apertis/ai-sdk-provider';
import { embed, embedMany } from 'ai';

// Single embedding
const { embedding } = await embed({
  model: apertis.textEmbeddingModel('text-embedding-3-small'),
  value: 'Hello world',
});

// Multiple embeddings
const { embeddings } = await embedMany({
  model: apertis.textEmbeddingModel('text-embedding-3-large'),
  values: ['Hello', 'World'],
});
```

## Supported Models

Any model available on [Apertis AI](https://apertis.ai), including:

### Chat Models
- **OpenAI**: `gpt-5.2`, `gpt-5.1`, `gpt-5.1-codex-mini`
- **Anthropic**: `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4.5`
- **Google**: `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-flash-preview`
- **Other**: `glm-4.7`, `minimax-m2.1`, and 500+ more models

### Embedding Models
- `text-embedding-3-small`, `text-embedding-3-large`

## Provider Configuration

```typescript
import { createApertis } from '@apertis/ai-sdk-provider';

const apertis = createApertis({
  apiKey: 'sk-your-api-key',                  // Optional if APERTIS_API_KEY is set
  baseURL: 'https://api.apertis.ai/v1',       // Custom API endpoint
  headers: { 'X-Custom': 'value' },           // Custom headers
});
```

### Use with OpenCode

Add to your `opencode.json`:

```json
{
  "provider": {
    "apertis": {
      "npm": "@apertis/ai-sdk-provider",
      "options": {
        "apiKey": "sk-your-api-key"
      },
      "models": {
        "claude-opus-4-6": { "name": "Claude Opus 4.6" },
        "claude-sonnet-4-6": { "name": "Claude Sonnet 4.6" }
      }
    }
  }
}
```

## Changelog

### v2.1.0

- Rewrite as thin wrapper over `@ai-sdk/openai-compatible` for guaranteed compatibility
- Works with AI SDK v5+ (OpenCode, Kilo Code, and all compatible tools)
- Simplified codebase (removed custom V2/V3 implementations)

### v2.0.x

- Default provider switched from V3 to V2 spec for broader compatibility
- Added V2 chat and embedding model implementations
- Fixed Zod parsing errors (`expected string, received object`) with OpenCode

### v1.x

- Custom `LanguageModelV3` implementation (requires AI SDK 6+)
- Custom streaming, tool calling, and embedding support

## License

Apache-2.0
