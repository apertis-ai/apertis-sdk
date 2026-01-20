# @apertis/ai-sdk-provider

Apertis AI provider for the [Vercel AI SDK](https://sdk.vercel.ai/).

## Compatibility

- **Requires AI SDK 6.0+** - This package implements the `LanguageModelV3` specification
- **Node.js 18+** - Minimum supported Node.js version

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

const { textStream } = await streamText({
  model: apertis('claude-sonnet-4.5'),
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

Generate vector embeddings for semantic search and similarity:

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
  model: apertis.textEmbeddingModel('text-embedding-3-large', {
    dimensions: 1024, // Optional: reduce dimensions
  }),
  values: ['Hello', 'World'],
});
```

## Supported Models

Any model available on Apertis AI, including:

### Chat Models
- `gpt-5.2`, `gpt-5.2-codex`, `gpt-5.1`
- `claude-opus-4-5-20251101`, `claude-sonnet-4.5`, `claude-haiku-4.5`
- `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-flash-preview`
- And 470+ more models

### Embedding Models
- `text-embedding-3-small`, `text-embedding-3-large`
- `text-embedding-ada-002`

## Provider Configuration

```typescript
import { createApertis } from '@apertis/ai-sdk-provider';

const apertis = createApertis({
  apiKey: 'sk-your-api-key',     // Optional if APERTIS_API_KEY is set
  baseURL: 'https://api.apertis.ai/v1',  // Custom API endpoint
  headers: { 'X-Custom': 'value' },      // Custom headers
});
```

## What's New (v1.1.1)

- **ProviderV3 Interface** - Full implementation of `ProviderV3` specification
- **Embedding Models** - Support for embeddings via `apertis.textEmbeddingModel()`
- **Schema Fixes** - More flexible response parsing for Apertis API compatibility

## Breaking Changes (v1.0.0)

- **Requires AI SDK 6+** - No longer compatible with AI SDK 5.x
- **V3 Specification** - Implements `LanguageModelV3` interface
- **Content format** - Output uses `content` array instead of separate `text`/`toolCalls`
- **Usage format** - Token tracking uses new `inputTokens`/`outputTokens` structure
- **Supported URLs** - New `supportedUrls` property for image URL support

## License

Apache-2.0
