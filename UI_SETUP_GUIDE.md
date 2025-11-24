# UI Setup Guide for Fashion Agent

This guide covers three approaches to create a UI for the Fashion Agent workflow with human-in-the-loop capabilities.

---

## **Option 1: LangGraph Studio (Development UI) - EASIEST**

LangGraph Studio provides a built-in UI for visualizing and interacting with your graph.

### Setup:

1. **Install LangGraph CLI:**
   ```bash
   pip install langgraph-cli
   ```

2. **Start the development server:**
   ```bash
   langgraph dev
   ```

   This starts a lightweight local dev server at `http://localhost:2024` with:
   - Graph visualization
   - Interactive execution
   - State inspection
   - Interrupt handling UI
   - Thread management

3. **Open Studio:**
   - Studio automatically opens in your browser
   - Navigate to the graph view
   - Click "Run" to execute with inputs
   - When interrupts occur, Studio shows a form to provide responses

### Using with HITL:

When the graph hits `user_input_collector`:
- Studio displays the interrupt payload with instructions
- You fill in the form with custom URLs, images, videos
- Click "Resume" to continue

When the graph hits `outfit_reviewer`:
- Studio shows the generated outfits
- You select approve/reject/edit
- Provide mandatory feedback/instructions
- Click "Resume"

**Pros:**
- Zero code required
- Full visualization
- Built-in thread/state management
- Perfect for debugging

**Cons:**
- Development tool only (not production-ready UI)
- Limited customization

---

## **Option 2: React Web App with LangGraph SDK - RECOMMENDED FOR PRODUCTION**

Build a custom React web app using the `useStream()` hook and LangGraph SDK.

### Architecture:

```
React Frontend (useStream hook)
        ↓
LangGraph Server API (http://localhost:2024)
        ↓
Your Fashion Agent Graph
```

### Setup:

#### 1. Start the Agent Server

```bash
# Install CLI
pip install langgraph-cli

# Start server
langgraph dev
# Server runs at http://localhost:2024
```

#### 2. Create React Frontend

Install dependencies:
```bash
npm create vite@latest fashion-ui -- --template react
cd fashion-ui
npm install @langchain/langgraph-sdk
```

Create the UI component:

```jsx
// src/FashionAgentUI.jsx
import { useState } from 'react';
import { Client } from '@langchain/langgraph-sdk';

const client = new Client({ 
  apiUrl: 'http://localhost:2024'
});

export default function FashionAgentUI() {
  const [threadId, setThreadId] = useState(null);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentInterrupt, setCurrentInterrupt] = useState(null);
  const [loading, setLoading] = useState(false);

  // User input form data
  const [customUrls, setCustomUrls] = useState('');
  const [customImages, setCustomImages] = useState('');
  const [customVideos, setCustomVideos] = useState('');

  // Outfit review form data
  const [reviewDecision, setReviewDecision] = useState('approve');
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [selectedOutfits, setSelectedOutfits] = useState([]);

  const startAnalysis = async () => {
    setLoading(true);
    setMessages([]);
    setCurrentInterrupt(null);

    try {
      // Create a new thread
      const thread = await client.threads.create();
      setThreadId(thread.thread_id);

      // Start the graph
      const result = await client.runs.wait(
        thread.thread_id,
        'agent', // Assistant ID from langgraph.json
        { input: { query } }
      );

      handleResult(result);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { type: 'error', content: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResult = (result) => {
    // Check for interrupts
    if (result.__interrupt__) {
      const interrupt = result.__interrupt__[0];
      setCurrentInterrupt(interrupt);
      
      setMessages(prev => [...prev, {
        type: 'interrupt',
        content: interrupt.value.message || 'Input required',
        details: interrupt.value
      }]);
    } else {
      // Final result
      setMessages(prev => [...prev, {
        type: 'result',
        content: 'Analysis complete!',
        data: result
      }]);
      setCurrentInterrupt(null);
    }
  };

  const resumeWithUserInput = async () => {
    setLoading(true);

    try {
      const resumeData = {
        custom_urls: customUrls.split('\n').filter(u => u.trim()),
        custom_images: customImages.split('\n').filter(i => i.trim()),
        custom_videos: customVideos.split('\n').filter(v => v.trim()),
        query: query || ''
      };

      const result = await client.runs.wait(
        threadId,
        'agent',
        { command: { resume: resumeData } }
      );

      // Clear form
      setCustomUrls('');
      setCustomImages('');
      setCustomVideos('');
      
      handleResult(result);
    } catch (error) {
      console.error('Error resuming:', error);
      setMessages(prev => [...prev, { type: 'error', content: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const resumeWithReview = async () => {
    setLoading(true);

    try {
      const resumeData = {
        decision_type: reviewDecision,
        rejection_feedback: reviewDecision === 'reject' ? rejectionFeedback : '',
        edit_instructions: reviewDecision === 'edit' ? editInstructions : '',
        selected_outfit_ids: selectedOutfits
      };

      // Validate mandatory fields
      if (reviewDecision === 'reject' && !rejectionFeedback.trim()) {
        alert('Rejection feedback is mandatory');
        setLoading(false);
        return;
      }

      if (reviewDecision === 'edit' && !editInstructions.trim()) {
        alert('Edit instructions are mandatory');
        setLoading(false);
        return;
      }

      const result = await client.runs.wait(
        threadId,
        'agent',
        { command: { resume: resumeData } }
      );

      // Clear form
      setRejectionFeedback('');
      setEditInstructions('');
      setSelectedOutfits([]);
      
      handleResult(result);
    } catch (error) {
      console.error('Error resuming:', error);
      setMessages(prev => [...prev, { type: 'error', content: error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const renderInterruptForm = () => {
    if (!currentInterrupt) return null;

    const interruptData = currentInterrupt.value;

    // User Input Collection Interrupt
    if (interruptData.instructions?.custom_urls !== undefined) {
      return (
        <div className="interrupt-form">
          <h3>📋 Customize Fashion Analysis Data</h3>
          <p>{interruptData.message}</p>
          
          <div className="form-group">
            <label>Custom URLs (one per line):</label>
            <textarea 
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              placeholder="https://example.com/fashion1\nhttps://example.com/fashion2"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Custom Image URLs (one per line):</label>
            <textarea 
              value={customImages}
              onChange={(e) => setCustomImages(e.target.value)}
              placeholder="https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Custom Video URLs (one per line):</label>
            <textarea 
              value={customVideos}
              onChange={(e) => setCustomVideos(e.target.value)}
              placeholder="https://example.com/video1.mp4"
              rows={3}
            />
          </div>

          <button onClick={resumeWithUserInput} disabled={loading}>
            {loading ? 'Processing...' : 'Continue Analysis'}
          </button>
        </div>
      );
    }

    // Outfit Review Interrupt
    if (interruptData.outfits) {
      return (
        <div className="interrupt-form">
          <h3>👗 Review Generated Outfits</h3>
          <p>{interruptData.message}</p>

          <div className="outfits-display">
            {interruptData.outfits.map((outfit, idx) => (
              <div key={idx} className="outfit-card">
                <h4>{outfit.name || `Outfit ${idx + 1}`}</h4>
                <p>{outfit.description}</p>
                {outfit.image_url && (
                  <img src={outfit.image_url} alt={outfit.name} />
                )}
                <label>
                  <input 
                    type="checkbox"
                    checked={selectedOutfits.includes(outfit.id || `outfit_${idx}`)}
                    onChange={(e) => {
                      const id = outfit.id || `outfit_${idx}`;
                      if (e.target.checked) {
                        setSelectedOutfits([...selectedOutfits, id]);
                      } else {
                        setSelectedOutfits(selectedOutfits.filter(s => s !== id));
                      }
                    }}
                  />
                  Select for video
                </label>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>Decision:</label>
            <select 
              value={reviewDecision}
              onChange={(e) => setReviewDecision(e.target.value)}
            >
              <option value="approve">✅ Approve</option>
              <option value="reject">❌ Reject</option>
              <option value="edit">✏️ Edit/Regenerate</option>
            </select>
          </div>

          {reviewDecision === 'reject' && (
            <div className="form-group">
              <label>Rejection Feedback (mandatory):</label>
              <textarea 
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="Explain why these outfits don't work..."
                rows={4}
                required
              />
            </div>
          )}

          {reviewDecision === 'edit' && (
            <div className="form-group">
              <label>Edit Instructions (mandatory):</label>
              <textarea 
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="What changes do you want? (e.g., 'Make it more formal', 'Add accessories')"
                rows={4}
                required
              />
            </div>
          )}

          <button onClick={resumeWithReview} disabled={loading}>
            {loading ? 'Processing...' : 'Submit Review'}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fashion-agent-ui">
      <h1>🎨 Fashion Agent Analyzer</h1>

      {!threadId ? (
        <div className="start-form">
          <div className="form-group">
            <label>Fashion Analysis Query:</label>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g., 'Show me summer casual outfits'"
            />
          </div>
          <button onClick={startAnalysis} disabled={loading || !query.trim()}>
            {loading ? 'Starting...' : 'Start Analysis'}
          </button>
        </div>
      ) : (
        <div className="thread-info">
          <p>Thread ID: {threadId}</p>
        </div>
      )}

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <strong>{msg.type.toUpperCase()}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {renderInterruptForm()}

      {loading && <div className="spinner">⏳ Processing...</div>}
    </div>
  );
}
```

Add styles:

```css
/* src/FashionAgentUI.css */
.fashion-agent-ui {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
}

.start-form, .interrupt-form {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  font-family: monospace;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
}

button:hover {
  background: #0056b3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.messages {
  margin: 20px 0;
}

.message {
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.message.error {
  background: #fee;
  border-left-color: #d00;
}

.message.interrupt {
  background: #ffc;
  border-left-color: #fa0;
}

.message.result {
  background: #efe;
  border-left-color: #0a0;
}

.outfits-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.outfit-card {
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
}

.outfit-card img {
  width: 100%;
  border-radius: 4px;
  margin: 10px 0;
}

.spinner {
  text-align: center;
  font-size: 24px;
  margin: 20px;
}
```

Use the component:

```jsx
// src/App.jsx
import FashionAgentUI from './FashionAgentUI';
import './FashionAgentUI.css';

function App() {
  return <FashionAgentUI />;
}

export default App;
```

Run the app:
```bash
npm run dev
```

### How It Works:

1. User enters a fashion query
2. Frontend creates a thread and invokes the graph
3. When `user_input_collector` interrupts:
   - `result.__interrupt__` contains the payload
   - UI shows form for custom URLs/images/videos
   - User submits → Frontend sends `Command(resume=data)`
4. When `outfit_reviewer` interrupts:
   - UI displays outfits with approve/reject/edit options
   - Validates mandatory feedback/instructions
   - User submits → Frontend resumes with decision
5. Graph completes → UI shows final results

**Pros:**
- Full customization
- Production-ready
- Can integrate with your own backend
- Handles streaming, interrupts, thread management

**Cons:**
- Requires React knowledge
- More setup than Studio

---

## **Option 3: Python Backend with API Routes**

Add custom FastAPI routes to expose a web interface directly from the agent server.

### Setup:

Create a web app file:

```python
# webapp.py
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Optional
import uuid

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Store active threads (in production, use Redis/DB)
active_threads = {}

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/start")
async def start_analysis(query: str = Form(...)):
    """Start a new fashion analysis"""
    from langgraph_sdk import get_client
    
    client = get_client(url="http://localhost:2024")
    
    # Create thread
    thread = await client.threads.create()
    thread_id = thread["thread_id"]
    
    # Start run
    result = await client.runs.wait(
        thread_id,
        "agent",
        input={"query": query}
    )
    
    active_threads[thread_id] = {
        "query": query,
        "status": "interrupted" if result.get("__interrupt__") else "complete"
    }
    
    return JSONResponse({
        "thread_id": thread_id,
        "interrupt": result.get("__interrupt__"),
        "result": result if not result.get("__interrupt__") else None
    })

@app.post("/api/resume/user_input")
async def resume_user_input(
    thread_id: str = Form(...),
    custom_urls: str = Form(""),
    custom_images: str = Form(""),
    custom_videos: str = Form(""),
    query: str = Form("")
):
    """Resume after user input collection"""
    from langgraph_sdk import get_client
    from langgraph_sdk.schema import Command
    
    client = get_client(url="http://localhost:2024")
    
    resume_data = {
        "custom_urls": [u.strip() for u in custom_urls.split("\n") if u.strip()],
        "custom_images": [i.strip() for i in custom_images.split("\n") if i.strip()],
        "custom_videos": [v.strip() for v in custom_videos.split("\n") if v.strip()],
        "query": query
    }
    
    result = await client.runs.wait(
        thread_id,
        "agent",
        command=Command(resume=resume_data)
    )
    
    return JSONResponse({
        "thread_id": thread_id,
        "interrupt": result.get("__interrupt__"),
        "result": result if not result.get("__interrupt__") else None
    })

@app.post("/api/resume/outfit_review")
async def resume_outfit_review(
    thread_id: str = Form(...),
    decision_type: str = Form(...),
    rejection_feedback: str = Form(""),
    edit_instructions: str = Form(""),
    selected_outfit_ids: str = Form("")
):
    """Resume after outfit review"""
    from langgraph_sdk import get_client
    from langgraph_sdk.schema import Command
    
    client = get_client(url="http://localhost:2024")
    
    # Validate mandatory fields
    if decision_type == "reject" and not rejection_feedback.strip():
        return JSONResponse(
            {"error": "Rejection feedback is mandatory"},
            status_code=400
        )
    
    if decision_type == "edit" and not edit_instructions.strip():
        return JSONResponse(
            {"error": "Edit instructions are mandatory"},
            status_code=400
        )
    
    resume_data = {
        "decision_type": decision_type,
        "rejection_feedback": rejection_feedback,
        "edit_instructions": edit_instructions,
        "selected_outfit_ids": [
            o.strip() for o in selected_outfit_ids.split(",") if o.strip()
        ]
    }
    
    result = await client.runs.wait(
        thread_id,
        "agent",
        command=Command(resume=resume_data)
    )
    
    return JSONResponse({
        "thread_id": thread_id,
        "interrupt": result.get("__interrupt__"),
        "result": result if not result.get("__interrupt__") else None
    })
```

Update `langgraph.json`:

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./graph.py:graph"
  },
  "http": {
    "app": "./webapp.py:app"
  },
  "env": ".env"
}
```

Create HTML template:

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Fashion Agent UI</title>
    <style>
        body { font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        label { display: block; font-weight: 600; margin-bottom: 5px; }
        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <h1>🎨 Fashion Agent Analyzer</h1>
    
    <div id="startForm">
        <form onsubmit="startAnalysis(event)">
            <div class="form-group">
                <label>Fashion Query:</label>
                <input type="text" id="query" required>
            </div>
            <button type="submit">Start Analysis</button>
        </form>
    </div>

    <div id="userInputForm" class="hidden">
        <h3>📋 Customize Analysis Data</h3>
        <form onsubmit="submitUserInput(event)">
            <input type="hidden" id="threadId">
            <div class="form-group">
                <label>Custom URLs (one per line):</label>
                <textarea id="customUrls" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label>Custom Images (one per line):</label>
                <textarea id="customImages" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label>Custom Videos (one per line):</label>
                <textarea id="customVideos" rows="3"></textarea>
            </div>
            <button type="submit">Continue</button>
        </form>
    </div>

    <div id="outfitReviewForm" class="hidden">
        <h3>👗 Review Outfits</h3>
        <div id="outfitsDisplay"></div>
        <form onsubmit="submitReview(event)">
            <div class="form-group">
                <label>Decision:</label>
                <select id="decisionType" onchange="toggleFeedbackFields()">
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="edit">Edit</option>
                </select>
            </div>
            <div id="rejectionField" class="form-group hidden">
                <label>Rejection Feedback (mandatory):</label>
                <textarea id="rejectionFeedback" rows="4"></textarea>
            </div>
            <div id="editField" class="form-group hidden">
                <label>Edit Instructions (mandatory):</label>
                <textarea id="editInstructions" rows="4"></textarea>
            </div>
            <button type="submit">Submit Review</button>
        </form>
    </div>

    <div id="results"></div>

    <script>
        let currentThreadId = null;

        async function startAnalysis(e) {
            e.preventDefault();
            const query = document.getElementById('query').value;
            
            const formData = new FormData();
            formData.append('query', query);
            
            const response = await fetch('/api/start', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            currentThreadId = result.thread_id;
            
            handleResult(result);
        }

        async function submitUserInput(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('thread_id', currentThreadId);
            formData.append('custom_urls', document.getElementById('customUrls').value);
            formData.append('custom_images', document.getElementById('customImages').value);
            formData.append('custom_videos', document.getElementById('customVideos').value);
            formData.append('query', document.getElementById('query').value);
            
            const response = await fetch('/api/resume/user_input', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            handleResult(result);
        }

        async function submitReview(e) {
            e.preventDefault();
            
            const decisionType = document.getElementById('decisionType').value;
            
            const formData = new FormData();
            formData.append('thread_id', currentThreadId);
            formData.append('decision_type', decisionType);
            formData.append('rejection_feedback', document.getElementById('rejectionFeedback').value);
            formData.append('edit_instructions', document.getElementById('editInstructions').value);
            formData.append('selected_outfit_ids', ''); // Get from checkboxes
            
            const response = await fetch('/api/resume/outfit_review', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            handleResult(result);
        }

        function handleResult(result) {
            if (result.interrupt) {
                const interrupt = result.interrupt[0];
                
                // Check interrupt type
                if (interrupt.value.instructions) {
                    // User input interrupt
                    document.getElementById('startForm').classList.add('hidden');
                    document.getElementById('userInputForm').classList.remove('hidden');
                } else if (interrupt.value.outfits) {
                    // Outfit review interrupt
                    document.getElementById('userInputForm').classList.add('hidden');
                    document.getElementById('outfitReviewForm').classList.remove('hidden');
                    displayOutfits(interrupt.value.outfits);
                }
            } else {
                // Complete
                document.getElementById('results').innerHTML = 
                    '<h3>✅ Analysis Complete!</h3><pre>' + 
                    JSON.stringify(result.result, null, 2) + 
                    '</pre>';
            }
        }

        function displayOutfits(outfits) {
            const display = document.getElementById('outfitsDisplay');
            display.innerHTML = outfits.map((outfit, idx) => `
                <div>
                    <h4>${outfit.name || 'Outfit ' + (idx + 1)}</h4>
                    <p>${outfit.description}</p>
                    ${outfit.image_url ? `<img src="${outfit.image_url}" style="max-width: 200px;">` : ''}
                </div>
            `).join('');
        }

        function toggleFeedbackFields() {
            const decision = document.getElementById('decisionType').value;
            document.getElementById('rejectionField').classList.toggle('hidden', decision !== 'reject');
            document.getElementById('editField').classList.toggle('hidden', decision !== 'edit');
        }
    </script>
</body>
</html>
```

Run:
```bash
langgraph dev
# Visit http://localhost:2024
```

**Pros:**
- Single deployment (backend + frontend)
- Python-based, matches your stack
- Custom HTML/CSS/JS

**Cons:**
- Less interactive than React
- Manual JavaScript coding

---

## **Recommended Approach**

1. **Development**: Use **LangGraph Studio** (Option 1) for quick testing
2. **Production**: Build a **React app with SDK** (Option 2) for full control
3. **Simple deployments**: Use **custom FastAPI routes** (Option 3) if you want everything in Python

---

## **Key API Endpoints Reference**

When the graph is running with `langgraph dev`, these endpoints are available:

```
POST /threads/create                    # Create a new conversation thread
POST /threads/{thread_id}/runs/wait     # Invoke graph and wait for completion
POST /threads/{thread_id}/runs/stream   # Stream graph execution
GET  /threads/{thread_id}/state         # Get current state
PUT  /threads/{thread_id}/state         # Update state (time travel)
GET  /threads/{thread_id}/history       # Get checkpoint history
```

### Example: Python SDK Usage

```python
from langgraph_sdk import get_client
from langgraph_sdk.schema import Command

client = get_client(url="http://localhost:2024")

# Create thread
thread = await client.threads.create()
thread_id = thread["thread_id"]

# Start run
result = await client.runs.wait(
    thread_id,
    "agent",  # From langgraph.json graphs key
    input={"query": "summer outfits"}
)

# Check for interrupt
if result.get("__interrupt__"):
    interrupt_data = result["__interrupt__"][0]["value"]
    
    # Resume with user input
    result = await client.runs.wait(
        thread_id,
        "agent",
        command=Command(resume={
            "custom_urls": ["https://example.com/fashion"],
            "custom_images": [],
            "custom_videos": [],
            "query": "summer outfits"
        })
    )
```

### Example: Streaming

```python
async for chunk in client.runs.stream(
    thread_id,
    "agent",
    input={"query": "winter coats"},
    stream_mode="updates"  # or "messages", "values"
):
    print(f"Event: {chunk.event}")
    print(f"Data: {chunk.data}")
```

---

## **Next Steps**

1. Choose your UI approach
2. Run `langgraph dev` to start the server
3. Test with LangGraph Studio first
4. Build custom UI using React or FastAPI
5. Deploy to production with proper authentication

All three options work with your existing HITL implementation! The interrupt payloads will automatically surface in the UI.
