# Fashion Agent UI

React-based web interface for the Fashion Agent workflow with human-in-the-loop capabilities.

## Features

- 🎨 **Interactive Fashion Analysis**: Start trend analysis with custom queries
- 📋 **Custom Data Input**: Add your own URLs, images, and videos for analysis
- 👗 **Outfit Review**: Approve, reject, or request changes to AI-generated designs
- 📊 **Real-time Updates**: Activity log showing workflow progress
- 🔄 **Thread Management**: Persistent conversation state across interrupts
- ✅ **Validation**: Enforces mandatory feedback for reject/edit decisions

## Prerequisites

1. **LangGraph Server**: The backend agent server must be running
   ```bash
   cd ..
   langgraph dev
   ```
   This starts the server at `http://localhost:2024`

2. **Node.js**: Version 16+ required

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
copy .env.example .env
```

## Configuration

Edit `.env` file:

```env
# LangGraph Server URL (default: http://localhost:2024)
VITE_API_URL=http://localhost:2024
```

## Development

```bash
# Start development server
npm run dev
```

The UI will be available at `http://localhost:3000`

## Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Usage Flow

### 1. Start Analysis
- Enter a fashion trend query (e.g., "Summer casual outfits for college students")
- Click "Start Analysis"
- A new thread is created for the workflow

### 2. Customize Data (First Interrupt)
When the workflow reaches the user input collector:
- **Custom URLs**: Add fashion article URLs you want analyzed
- **Custom Images**: Add direct image URLs of outfits/styles
- **Custom Videos**: Add YouTube or fashion show videos
- Click "Continue Analysis" or "Skip & Use Defaults"

### 3. Review Outfits (Second Interrupt)
When outfits are generated:
- **View Designs**: See AI-generated outfit cards with images and descriptions
- **Select Outfits**: Check boxes to select which outfits to process
- **Make Decision**:
  - ✅ **Approve**: Continue to video generation
  - ❌ **Reject**: Stop workflow (requires feedback)
  - ✏️ **Edit**: Regenerate outfits (requires change instructions)
- Submit your decision

### 4. Complete
- View final results in the activity log
- Start a new analysis with "Start New Analysis" button

## Architecture

```
React Frontend (Port 3000)
        ↓
    Vite Proxy
        ↓
LangGraph Server API (Port 2024)
        ↓
Fashion Agent Graph
```

## Components

- **`FashionAgentUI.jsx`**: Main coordinator component
- **`UserInputForm.jsx`**: Custom data input interface
- **`OutfitReviewForm.jsx`**: Outfit approval/review interface
- **`MessageList.jsx`**: Activity log display

## API Integration

The UI uses `@langchain/langgraph-sdk` to interact with the graph:

```javascript
import { Client } from '@langchain/langgraph-sdk';

const client = new Client({ apiUrl: 'http://localhost:2024' });

// Create thread
const thread = await client.threads.create();

// Invoke graph
const result = await client.runs.wait(
  thread.thread_id,
  'agent',
  { input: { query: 'fashion query' } }
);

// Resume from interrupt
const resumeResult = await client.runs.wait(
  thread.thread_id,
  'agent',
  { command: { resume: userData } }
);
```

## Customization

### Styling
All styles use vanilla CSS in component-specific files:
- `FashionAgentUI.css`
- `UserInputForm.css`
- `OutfitReviewForm.css`
- `MessageList.css`

Modify gradient colors in `App.css`:
```css
.app {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### API Endpoint
Change server URL in `.env`:
```env
VITE_API_URL=https://your-production-server.com
```

### Interrupt Handling
Add custom interrupt types in `FashionAgentUI.jsx`:
```javascript
const handleResult = (result) => {
  if (result.__interrupt__) {
    const payload = result.__interrupt__[0].value;
    
    // Add your custom interrupt type
    if (payload.customField) {
      setInterruptType('custom_type');
    }
  }
};
```

## Troubleshooting

### "Failed to fetch" error
- Ensure LangGraph server is running: `langgraph dev`
- Check server URL in `.env` matches actual server port
- Verify CORS settings if using different domains

### Interrupts not appearing
- Check that `interrupt()` is called in your graph nodes
- Verify `checkpointer` is configured in `langgraph.json`
- Ensure thread_id is consistent across requests

### Validation errors
- Check that mandatory fields are filled:
  - Reject requires `rejection_feedback`
  - Edit requires `edit_instructions`
- Verify Pydantic models match between UI and backend

## License

MIT
