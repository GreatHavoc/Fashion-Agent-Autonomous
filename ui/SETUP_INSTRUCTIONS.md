# Quick Setup Instructions

## Step 1: Start the Backend

```bash
# Navigate to the main project directory
cd d:\Office\fashion_agent

# Start LangGraph development server
langgraph dev
```

This starts the agent server at `http://localhost:2024`

## Step 2: Install Frontend Dependencies

```bash
# Navigate to UI directory
cd ui

# Install dependencies
npm install
```

## Step 3: Configure Environment

```bash
# Copy environment template
copy .env.example .env
```

The default `.env` should work if your backend is on port 2024:
```env
VITE_API_URL=http://localhost:2024
```

## Step 4: Start the UI

```bash
# Start development server
npm run dev
```

The UI will open at `http://localhost:3000`

## Step 5: Test the Workflow

1. **Enter Query**: "Show me trendy summer outfits for college students"
2. **Click "Start Analysis"**
3. **First Interrupt**: Add custom URLs/images or skip
4. **Second Interrupt**: Review generated outfits and approve/reject/edit
5. **View Results**: See the complete analysis

## Troubleshooting

### Port Already in Use
If port 3000 is busy, Vite will suggest an alternative port. Accept it or change in `vite.config.js`:
```javascript
server: {
  port: 3001, // Change to any free port
}
```

### Backend Not Reachable
Check if LangGraph server is running:
```bash
# Should show server output
langgraph dev
```

Verify the server URL:
- Open `http://localhost:2024/docs` in browser
- Should show API documentation

### Missing Dependencies
If you see import errors:
```bash
npm install @langchain/langgraph-sdk react react-dom lucide-react
```

## Production Deployment

### Build the UI
```bash
npm run build
```

This creates optimized files in `dist/` folder.

### Serve Static Files
```bash
npm run preview
```

Or deploy `dist/` to any static hosting (Netlify, Vercel, etc.)

### Backend Deployment
Deploy the LangGraph server using:
```bash
langgraph build
langgraph up
```

Update `.env` in UI with production URL:
```env
VITE_API_URL=https://your-production-server.com
```

## Next Steps

- Customize the UI styling in component CSS files
- Add more interrupt handlers for custom workflow steps
- Integrate with authentication system
- Add analytics and monitoring
- Implement file upload for local images/videos
