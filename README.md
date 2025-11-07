# Claude Integration for Obsidian

[![Vibe Coded](https://img.shields.io/badge/🎵_Vibe-Coded-blueviolet?style=for-the-badge)](https://github.com/bodfather/obsidian-claude-plugin#-vibe-coded--ai-assisted-development)
[![AI-Assisted Development](https://img.shields.io/badge/AI-Assisted_Development-00D4FF?style=for-the-badge&logo=anthropic)](https://www.anthropic.com/claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-483699?style=for-the-badge&logo=obsidian)](https://obsidian.md)

Integrate Claude AI directly into Obsidian with powerful file editing capabilities and intelligent vault awareness.

## 🚀 Features

### Core Capabilities
- **Persistent Chat Interface**: Chat with Claude directly in your Obsidian sidebar
- **Conversation Persistence**: Conversations are automatically saved and restored on reload
- **File Reading & Writing**: Claude can read, edit, and create files in your vault
- **Wikilink Support**: Reference files using `[[wikilinks]]` with intelligent autocomplete
- **File Attachments**: Drag & drop files or manually attach them before sending
- **Efficient File Operations**: Smart tools for searching and modifying files without reading entire contents
- **Vault Awareness**: Claude knows your vault structure and active file context
- **Tool Use**: Advanced function calling with automatic retry logic and error handling

### Intelligent Tools
- `read_file` - Read any file in your vault
- `write_file` - Create or completely rewrite files
- `copy_file` - Duplicate/copy files efficiently (no token overhead for content)
- `replace_in_file` - Make targeted text replacements (efficient for large files)
- `search_in_file` - Search for patterns without reading full file
- `get_file_info` - Get file metadata (size, line count, preview)
- `list_files` - List all markdown files in vault or specific folder
- `rename_file` - Rename or move files to different locations
- `delete_file` - Delete files from the vault (moves to trash)

### Advanced Features
- **Conversation Management**:
  - **Auto-save**: Conversations automatically saved after each exchange
  - **Auto-restore**: Last conversation automatically loaded when opening chat
  - **Load conversations**: Browse and load up to 10 most recent conversations
  - **Export to markdown**: Export full conversation history to a markdown file in your vault
  - Conversations persist across Obsidian reloads and plugin updates
- **Wikilink Autocomplete**: Start typing `[[` and get intelligent file suggestions with arrow key navigation
- **Drag & Drop Files**: Drag files from Obsidian's file explorer directly into the chat input
- **Manual File Attachments**: Attach active file or search vault to attach specific files
- **Attachment Chips**: Visual indicators showing attached files with size and remove options
- **Automatic Retry Logic**: Handles API overload errors with exponential backoff (1s → 2s → 4s)
- **Intelligent Token Management**:
  - Real-time context usage monitoring with color-coded indicators
  - Automatic conversation summarization when context fills up
  - Smart history pruning removes low-value messages
  - Manual summarize button to reduce token usage anytime
  - Rate limit display (hover token indicator to see model-specific limits)
  - Detailed error messages showing which limit was hit and when to retry
  - Configurable thresholds and limits
- **Prompt Caching**: Optional 90% cost reduction for repeated requests (requires paid API plan)
- **Multiple Models**: Support for Claude Sonnet 4.5, Haiku 4.5, Opus 4.1, and more
- **Copy Functionality**: Easy copy buttons on all Claude responses
- **Error Handling**: Detailed, actionable error messages for all failure scenarios

## 📋 Requirements

- Obsidian v0.15.0 or higher
- Anthropic API key (paid account with credits)

## 🔐 Security & Privacy

### Important Information

⚠️ **API Key Storage**: Your Anthropic API key is stored locally in Obsidian's data folder (`.obsidian/plugins/claude-integration/data.json`). It never leaves your machine except when making API calls to Anthropic.

⚠️ **File Access**: This plugin can read and modify any file in your vault. Claude will only access files when you explicitly ask it to or when using file-related commands.

⚠️ **API Costs**: Using this plugin incurs costs based on Anthropic's pricing. Each message sent costs tokens based on:
- Input tokens (your messages + file contents + conversation history)
- Output tokens (Claude's responses)

Typical costs:
- Small file edit: ~1,500 tokens ($0.015 for Sonnet 4.5)
- Large file read: ~15,000+ tokens ($0.15 for Sonnet 4.5)
- Long conversation: Token costs accumulate over time

💡 **Cost Saving Tips**:
- **Watch the token indicator** - Monitor context usage in real-time (green/orange/yellow/red)
- **Use wikilinks `[[file]]`** - Most efficient way to reference files
- **Attach files manually** - Saves tool call overhead vs asking Claude to read
- **Summarize history** - Click the "📝 Summarize History" button when indicator is orange or red
- **Enable smart pruning** - Automatically removes "ok", "thanks" and other low-value messages
- Use efficient tools (`search_in_file`, `replace_in_file`) for large files
- Enable prompt caching if you have a paid plan (90% cost reduction)
- Switch to Haiku model for faster, cheaper responses

### Data Privacy
- All data stays on your machine and Anthropic's servers
- No third-party tracking or analytics
- Conversation history stored locally in Obsidian
- API calls made directly to Anthropic (no intermediary servers)

## 📦 Installation

### From Obsidian Community Plugins (Recommended - Coming Soon)
1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Claude Integration"
4. Install and enable the plugin
5. Configure your API key in plugin settings

### Manual Installation (For Testing)
1. Download the latest release from GitHub
2. Extract the files to `YourVault/.obsidian/plugins/claude-integration/`
3. Enable the plugin in Obsidian Settings → Community Plugins
4. Add your Anthropic API key in plugin settings

### Development Installation
```bash
cd YourVault/.obsidian/plugins/
git clone https://github.com/bodfather/obsidian-claude-plugin.git claude-integration
cd claude-integration
npm install
npm run build
```

Then enable the plugin in Obsidian.

## 🔑 Getting an API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Generate a new API key
5. **Purchase credits** (required - plugin won't work without credits)
6. Copy the key (starts with `sk-ant-...`)
7. Paste into plugin settings in Obsidian

**Note**: You need a paid Anthropic account with credits. Free tier does not provide API access.

## 📖 Usage

### Opening Claude Chat
- **Ribbon Icon**: Click the bot icon in the left sidebar
- **Command Palette**: Search for "Open Claude Chat"
- **Shortcut**: No default shortcut (you can configure one in Hotkeys settings)

### Basic Chat
1. Open Claude Chat from the ribbon or command palette
2. Type your message in the input area
3. Press Enter or click the orange up arrow button
4. Claude will respond in the chat area
5. Copy responses using the copy button (top or bottom of message)

### File Operations

**Using Wikilinks** (Token-Efficient):
```
Summarize [[workspace-guide]] and [[project-plan]]
```
- Type `[[` to trigger autocomplete
- Use ↑↓ arrow keys to navigate suggestions
- Press Enter or click to select
- Claude automatically reads wikilinked files

**Drag & Drop Files**:
1. Drag a file from Obsidian's file explorer
2. Drop it onto the chat input area
3. The file appears as an attachment chip
4. Send your message - Claude receives the file content

**Manual Attachment**:
- Click the 📎 paperclip icon to attach the active file
- Click the 🔍 search icon to search vault and select files
- View attached files as chips below the input
- Click × to remove attachments

**Direct Commands**:
```
Read workspace-guide.md
Make the word "important" bold in my active file
Create a new file called "meeting-notes.md" with a template
Search for all instances of "TODO" in my project notes
Show me information about workspace-guide.md without reading the full file
```

### Efficient Workflows

For **large files**, Claude will automatically:
1. Check file size first
2. Use `get_file_info` to preview content
3. Use `search_in_file` to find specific sections
4. Use `replace_in_file` for targeted edits (instead of rewriting entire file)

### Wikilink Features

**Autocomplete**:
- Type `[[` to trigger intelligent file suggestions
- Suggestions appear as you type (minimum 2 characters)
- Shows file basename and full path if in subfolders
- Navigate with ↑↓ arrow keys
- Press Enter or click to insert
- Press Esc to dismiss suggestions
- Supports up to 10 suggestions at once

**Auto-Read Files**:
- Claude automatically reads all wikilinked files before processing your message
- Example: `Compare [[note1]] with [[note2]]` reads both files automatically
- Large files are truncated to 15,000 characters (with warning)
- File contents are wrapped with `[File: path]` and `[End File: path]` markers
- Duplicate wikilinks are de-duplicated (only read once)

**Wikilink Resolution**:
- Matches by exact filename: `[[my-note]]`
- Works without `.md` extension
- Supports aliases: `[[my-note|display name]]`
- Case-insensitive matching
- Partial path matching if needed

### Vault Search Feature

The **Search Vault** (🔍) button opens a powerful search modal:

1. **Search all files** for text patterns
2. **See results grouped by file** with line numbers and context
3. **Select specific results** with checkboxes
4. **Send to Claude** with full context (3 lines before/after each match)
5. Limit: 50 results displayed (refine search for more specific matches)

Perfect for:
- Finding all TODOs across your vault
- Locating specific code patterns
- Gathering related content from multiple files

### Conversation Management

The plugin automatically saves and manages your conversations:

**Auto-Save & Restore**:
- Conversations are automatically saved after each message exchange
- **AI-Generated Names**: Claude automatically creates descriptive 3-5 word titles for each conversation
- Last conversation automatically loads when you reopen the chat
- Up to 10 most recent conversations are kept
- Conversations persist across Obsidian reloads and plugin updates

**Icon Buttons** (below chat input):
- **📎 Attach File**: Attach the active file to your message
- **🔍 Search Vault**: Search vault and send results to Claude
- **🗑️ New Conversation**: Start fresh (clears current conversation)
- **📥 Past Conversations**: Browse and load saved conversations
  - Shows AI-generated descriptive title (e.g., "Obsidian Plugin Development")
  - Displays date and message count
  - Load or delete conversations from the modal
- **📄 Export**: Export current conversation to markdown file in vault
  - Includes all messages with proper formatting
  - Shows which tools were used
  - File saved as `claude-conversation-{timestamp}.md`

**Managing Conversations**:
1. Click **📥 Past Conversations** to see saved conversations
2. Each entry shows:
   - AI-generated descriptive title (automatically created by Claude Haiku)
   - Timestamp of last update
   - Number of messages
3. Click **Load** to restore that conversation
4. Click **Delete** to remove saved conversation

**Tips**:
- New conversations start fresh (good for unrelated topics)
- Load old conversations to continue previous discussions
- Export important conversations for reference or sharing
- Conversations are limited to 10 most recent (oldest auto-deleted)

### Token Management & Context Monitoring

The plugin includes intelligent token management to prevent "max tokens" errors and reduce API costs:

**Status Bar** (above chat input) shows two indicators:

**Token Indicator** (left):
- 🟢 **Green (0-59%)**: Low usage - you're good to go
- 🟠 **Orange (60-74%)**: Medium usage - consider summarizing soon
- 🟡 **Yellow (75-89%)**: High usage - summarize recommended
- 🔴 **Red (90%+)**: Critical - summarize now to prevent errors
- Hover to see model-specific rate limits (RPM, ITPM, OTPM)

**Model Indicator** (right):
- ⚡ **Haiku 4.5** - Fastest & cheapest (50k input tokens/min)
- 🎵 **Sonnet 4.5** - Balanced performance (30k input tokens/min)
- 👑 **Opus 4.1** - Most capable (30k input tokens/min)
- Shows which model is currently active with down arrow `▼`
- **Click to switch models instantly** - no need to go to settings!
- Opens modal with all available models and descriptions
- Switch mid-conversation for optimal cost/performance balance

**Automatic Management**:
- **Smart Pruning**: Removes low-value messages like "ok", "thanks", "got it"
- **Auto-Summarization**: When context exceeds 60% (configurable), old messages are automatically summarized
- **Intelligent Truncation**: Old tool results and responses are shortened while keeping recent messages intact

**Manual Control**:
- **Summarize Button**: Appears when context ≥60% - click to manually condense history
- **Clear History**: Start fresh conversation (removes all history)

**What Gets Summarized**:
- Keeps last 10 messages in full detail
- Older messages condensed into brief summaries
- Summary included in system prompt for context continuity
- Tool usage tracked (e.g., "Tools used: read_file, write_file")

**Settings** (Configure in plugin settings):
- **Enable Smart Pruning**: Toggle automatic removal of low-value messages
- **Max History Messages**: Set maximum messages to keep (default: 20)
- **Auto-Summarize Threshold**: Set percentage to trigger auto-summarization (default: 60%)

### Chat Interface Controls

**Icon Buttons** (below chat input):
- 📎 **Attach File**: Attach the currently active file
- 🔍 **Search Vault**: Search and select multiple files to attach
- 🗑️ **Clear History**: Remove all conversation history (with confirmation)

**Clearing History**:
- Frees up tokens for future requests
- Reduces API costs
- Starts a fresh conversation context
- Requires confirmation to prevent accidental deletion

## ⚙️ Configuration

### Settings

**Anthropic API Key**: Your API key from console.anthropic.com (required)

**Model**: Choose your preferred Claude model
- **Claude Sonnet 4.5** (Default) - Best balance of speed and capability
- **Claude Haiku 4.5** - Fastest and cheapest
- **Claude Opus 4.1** - Most capable but expensive
- Other models also available

**Max Output Tokens**: Maximum response length (default: 4096)
- Higher values = longer responses but higher costs
- Range: 1024 - 10000
- **Recommended**: 8000 for multi-file operations (atomic notes, batch edits)
- If you see "Response truncated" messages, increase this value
- Respects model output token rate limits (Haiku: 10k/min, Sonnet/Opus: 8k/min)

**Enable Prompt Caching**: Cache system prompts to reduce costs by 90% (default: on)
- Only works with paid API plans that support prompt caching
- Reduces input token costs for repeated content
- Highly recommended for frequent use

**Custom System Prompt**: Add your own instructions to Claude's system prompt
- Customize behavior, style, or domain knowledge
- Example: "Always use Oxford commas. Prefer concise explanations."

### Token Management Settings

**Enable Smart Pruning**: Automatically remove low-value messages (default: on)
- Removes acknowledgments like "ok", "thanks", "got it"
- Keeps all messages with substantial content
- Always preserves last 5 messages

**Max History Messages**: Maximum messages before truncation (default: 20)
- Range: 1-100 messages
- Lower values = lower token usage
- Higher values = more conversation context

**Auto-Summarize Threshold**: Trigger percentage for auto-summarization (default: 60%)
- Range: 50%-100%
- At threshold, old messages are automatically condensed
- Set to 100% to disable auto-summarization

## 🐛 Troubleshooting

### Message: "Response truncated - Hit max output token limit"
**Cause**: Claude's response exceeded the `Max Output Tokens` setting (output was too long)

**This is NOT an error** - the plugin handles this gracefully:
- Any tool calls (file writes, etc.) are executed automatically
- Partial response is shown in chat
- Type **"continue"** to resume where it left off

**Solutions**:
- **Type "continue"** - Claude will pick up where it stopped
- **Increase Max Output Tokens** in settings (Settings → Claude Integration → Max Output Tokens)
  - Default: 4096 tokens
  - Recommended for atomic notes/batch operations: 8000 tokens
  - Maximum safe value: 10,000 tokens (Haiku), 8,000 tokens (Sonnet/Opus)
- **Break up large tasks** - Ask for fewer files at once
- **Switch to Haiku** - Higher output token rate limit (10k/min vs 8k/min)

**Note**: This is different from hitting the 200k context window limit (which affects conversation history).

### Error: "Rate limit exceeded"
**Cause**: Hit one of the API's per-minute limits

**Rate Limits (Tier 1 - Default):**
- **Requests**: 50 requests/minute
- **Input Tokens (Claude Sonnet/Opus 4.x)**: 30,000 tokens/minute (uncached only)
- **Input Tokens (Claude Haiku 4.5)**: 50,000 tokens/minute (uncached only)
- **Output Tokens (Claude Sonnet/Opus 4.x)**: 8,000 tokens/minute
- **Output Tokens (Claude Haiku 4.5)**: 10,000 tokens/minute

**Important**: Only **uncached** tokens count toward input limits! Cached tokens (with prompt caching enabled) don't count.

**Solutions**:
1. **Wait**: The error shows retry-after seconds - wait that long
2. **Enable prompt caching**: Reduces input token usage by 90%
3. **Summarize history**: Click "📝 Summarize History" button
4. **Clear history**: Click 🗑️ to start fresh
5. **Switch to Haiku**: Higher limits (50k input tokens/min)
6. **Use smaller files**: Work with targeted sections
7. **Hover token indicator**: Shows your model's specific limits

### Error: "API is overloaded"
**Cause**: Anthropic's servers are experiencing high traffic

**Solutions**:
- Plugin will automatically retry 3 times (1s, 2s, 4s delays)
- If all retries fail, wait a minute and try again
- Check [Anthropic Status](https://status.anthropic.com) for outages

### Error: "Invalid API key"
**Cause**: API key is incorrect, expired, or has no credits

**Solutions**:
- Verify API key in settings (should start with `sk-ant-`)
- Check you have credits at console.anthropic.com
- Generate a new API key if needed

### Error: "File not found"
**Cause**: Claude tried to access a file that doesn't exist

**Solutions**:
- Check the file path is correct
- Use `list_files` command to see available files
- Create the file first if needed

### Plugin Not Loading
**Cause**: Build error or missing dependencies

**Solutions**:
- Check Obsidian's developer console (Ctrl+Shift+I)
- Rebuild plugin: `npm install && npm run build`
- Ensure you're on Obsidian v0.15.0 or higher

### Claude Can't See Active File
**Cause**: No file is currently open or active

**Solutions**:
- Open a file in the editor
- Claude will automatically detect the active file path
- Check the system prompt confirms "Currently active file: ..."

### Send Button Icon Not Displaying
**Cause**: SVG viewBox coordinates were outside the visible area

**Fixed in v1.0.1**: The send button arrow icon now uses correct SVG coordinates that display properly across all devices and browsers. If you still don't see the icon:
- Ensure you're on the latest version
- The button still works even if icon doesn't display - click where it should be
- Check browser console for SVG rendering errors

## 🎯 Best Practices

### Token Efficiency
1. **Monitor the token indicator** - Keep an eye on the color-coded usage percentage
2. **Summarize proactively** - Click the summarize button when indicator turns orange
3. **Use wikilinks** - `[[file]]` syntax auto-reads files token-efficiently
4. **Attach files** instead of asking Claude to read them (saves 1 tool call per file)
5. Use `search_in_file` instead of reading entire large files
6. Use `replace_in_file` for small edits instead of rewriting files
7. **Enable smart pruning** - Let the plugin automatically remove low-value messages
8. Clear conversation history after completing major tasks
9. Enable prompt caching if you use the plugin frequently

### Security
1. Never share your API key
2. Review file changes before accepting them
3. Use version control (git) to track changes
4. Clear history when discussing sensitive information

### Performance
1. Keep conversations focused (clear history between different tasks)
2. Use Haiku model for simple tasks
3. Use Sonnet for complex reasoning
4. Use Opus only when you need maximum capability

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
```bash
git clone https://github.com/bodfather/obsidian-claude-plugin.git
cd obsidian-claude-plugin
npm install
npm run dev  # For development with auto-rebuild
```

### Building
```bash
npm run build  # Production build
```

## 🎵 Vibe Coded | AI-Assisted Development

This plugin was developed through **AI-assisted programming** - a collaborative process between human direction and AI implementation. In other words: we're eating our own dog food! 🐕

**The Development Process:**

👨‍💻 **Human (bodfather)**
- Product vision and feature design
- UX decisions and user experience flow
- Architecture and technical approach
- Testing, debugging, and quality assurance
- Strategic decisions about token optimization, error handling, and retry logic

🤖 **AI Assistant (Claude)**
- Code implementation and generation
- API integration and TypeScript development
- Documentation writing and README creation
- Debugging assistance and code optimization
- Security improvements (removing innerHTML, using DOM API)

**Why This Matters:**

This isn't just a Claude integration plugin - it's a **meta-demonstration** of what's possible when humans and AI collaborate effectively. We used Claude to build a tool that lets others use Claude in Obsidian.

**The "Vibe Coding" Philosophy:**

Traditional coding: Human writes every line
```
Human -> Code -> Product
```

Vibe Coding: Human provides vision, AI provides implementation
```
Human Vision -> AI Implementation -> Human Review -> Product
```

You focus on the **what** and **why**, while AI handles the **how**. This is the future of software development: humans steering intelligent tools to build better products faster.

**Transparency Commitment:**

We believe in being honest about development processes. AI-assisted development is:
- ✅ **Legitimate** - You own the output
- ✅ **Efficient** - Build faster without sacrificing quality
- ✅ **Creative** - Spend time on design, not boilerplate
- ✅ **The Future** - This is how software will be built

**Want to Learn This Workflow?**

Check out [Claude Code](https://claude.ai/claude-code) to see how AI-assisted development works, or read our [Vibe Coding Manifesto](VIBE-CODING.md) for a complete guide to AI-assisted development philosophy and practices.

**Start Your Own Vibe-Coded Project:**

If you're inspired to try AI-assisted development:
1. Have a clear vision of what you want to build
2. Use Claude (or similar) to implement your ideas
3. Review, test, and refine the code
4. Be transparent about your process
5. Add the "Vibe Coded" badge to your README!

```markdown
[![Vibe Coded](https://img.shields.io/badge/🎵_Vibe-Coded-blueviolet?style=for-the-badge)](https://github.com/bodfather/obsidian-claude-plugin#-vibe-coded--ai-assisted-development)
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built using the [Obsidian API](https://docs.obsidian.md/Home)
- Powered by [Anthropic's Claude AI](https://www.anthropic.com/claude)
- Developed in collaboration with Claude AI (yes, we used Claude to build the Claude plugin - dog food tastes good! 🐕)
- Inspired by the Obsidian community's incredible plugin ecosystem
- Special thanks to the AI-assisted development community for pioneering transparent development practices

## 📞 Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/bodfather/obsidian-claude-plugin/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/bodfather/obsidian-claude-plugin/discussions)
- **Obsidian Forum**: Join discussions at [forum.obsidian.md](https://forum.obsidian.md)

## ⚠️ Disclaimer

This plugin is not affiliated with, endorsed by, or sponsored by Anthropic or Obsidian. Use at your own risk. The author is not responsible for:
- API costs incurred from using this plugin
- Data loss or file corruption (always backup your vault)
- Any damages resulting from the use of this plugin

Always backup your vault before using plugins that can modify files.

---

**Version**: 1.3.1
**Author**: bodfather
**Repository**: https://github.com/bodfather/obsidian-claude-plugin

## 📋 Changelog

### v1.3.1 - In-Chat Model Selector & Enhanced Loading
- 🎯 **In-Chat Model Selector** - switch models without leaving the chat
  - Click model indicator (with `▼` arrow) to open picker modal
  - Shows all 8 models with icons, names, and use-case descriptions
  - Instant switching with visual feedback and confirmation notice
  - Current model highlighted in picker
  - 15px padding for better click target
- ✨ **Enhanced Loading Animation**
  - Slowed animation from 1.5s to 3s for better readability
  - Beautiful shimmer effect with moving light sweep
  - Auto-scrolls chat to show loading messages
  - More polished and professional feel
- 🐛 **Bug Fix**: Fixed Haiku model ID for AI conversation naming
  - Corrected from `claude-haiku-4-5-20250925` to `claude-haiku-4-5-20251001`
  - Resolves 404 errors when generating conversation names
- ⚡ **Live Updates**: Model indicator updates instantly when changed in settings

### v1.3.0 - Conversation Persistence & Management
- 💾 **Conversation Persistence** - conversations automatically saved and restored
  - Auto-save after each message exchange
  - Auto-restore last conversation when opening chat
  - Keeps up to 10 most recent conversations
  - Survives Obsidian reloads and plugin updates
- 🤖 **AI-Generated Conversation Names** - Claude automatically creates descriptive titles
  - Uses Claude Haiku to generate concise 3-5 word titles
  - Based on conversation content (not just first message)
  - Fallback to message preview if API fails
  - Fixed Haiku model ID (404 error resolved)
- 📥 **Past Conversations** - browse, load, and delete saved conversations
  - Modal shows AI-generated title, date, and message count
  - One-click load or delete
- 📄 **Export to Markdown** - export full conversation history
  - Saves to vault as `claude-conversation-{timestamp}.md`
  - Includes all messages and tool usage info
  - Perfect for sharing or archival
- 🎨 **In-Chat Model Selector** - switch models without going to settings
  - Click model indicator to open picker modal
  - Shows all 8 models with icons and descriptions
  - Instant switching with visual feedback
  - Down arrow `▼` indicates clickability
- ✨ **Enhanced Loading Animation**
  - Slowed from 1.5s to 3s for better readability
  - Beautiful shimmer effect with moving light
  - Auto-scrolls to show loading messages
- 🎨 **New UI buttons** for conversation management (attach, search, new, past conversations, export)

### v1.2.0 - Graceful max_tokens Handling & Model Indicator
- 🛡️ **Graceful max_tokens handling** - no more errors when responses are too long
  - Partial responses are shown and tool calls still execute
  - Type "continue" to resume where Claude left off
  - Conversation history stays valid (fixes tool_result mismatch errors)
- 🎵 **Model indicator** in status bar - shows which Claude model is active (⚡ Haiku, 🎵 Sonnet, 👑 Opus)
- ⚙️ **Improved Max Output Tokens setting** - clearer guidance and validation (1024-10000 range)
- 📖 **Better documentation** for output token limits vs context window limits

### v1.1.0 - Intelligent Token Management & Efficiency
- ✨ **Real-time token usage indicator** with color-coded warnings
- ✨ **Automatic conversation summarization** when context fills up
- ✨ **Smart history pruning** removes low-value messages
- ✨ **Manual summarize button** to reduce token usage anytime
- ⚙️ **Configurable settings** for token management (thresholds, limits)
- 🐛 **Prevents "max_tokens" errors** that occurred with long conversations
- 📊 Shows exact token count and percentage in UI
- 🚦 **Accurate rate limit detection** - distinguishes between rate_limit_error (429) and overloaded_error (529)
- 📋 **Model-specific limit display** - hover token indicator to see RPM, ITPM, OTPM limits for your model
- ⏱️ **Retry-after parsing** - error messages show exactly how long to wait
- 💡 **Better error guidance** - specific solutions for each rate limit type (requests, input tokens, output tokens)
- 📋 **New `copy_file` tool** - Efficiently duplicate files without sending content through API (saves ~5,000+ tokens per duplication)

### v1.0.0 - Initial Release
- 🎉 Full Claude integration with Obsidian
- 📎 Wikilink support with autocomplete
- 🖱️ Drag & drop file attachments
- 🔍 Vault search modal
- 🔧 8 intelligent file operation tools
- ⚡ Automatic retry logic for API errors
- 💾 Prompt caching support
