# Claude Integration for Obsidian

[![Vibe Coded](https://img.shields.io/badge/🎵_Vibe-Coded-blueviolet?style=for-the-badge)](https://github.com/bodfather/obsidian-claude-plugin#-vibe-coded--ai-assisted-development)
[![AI-Assisted Development](https://img.shields.io/badge/AI-Assisted_Development-00D4FF?style=for-the-badge&logo=anthropic)](https://www.anthropic.com/claude)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-483699?style=for-the-badge&logo=obsidian)](https://obsidian.md)

Integrate Claude AI directly into Obsidian with powerful file editing capabilities and intelligent vault awareness.

## 🚀 Features

### Core Capabilities
- **Persistent Chat Interface**: Chat with Claude directly in your Obsidian sidebar
- **File Reading & Writing**: Claude can read, edit, and create files in your vault
- **Efficient File Operations**: Smart tools for searching and modifying files without reading entire contents
- **Vault Awareness**: Claude knows your vault structure and active file context
- **Tool Use**: Advanced function calling with automatic retry logic and error handling

### Intelligent Tools
- `read_file` - Read any file in your vault
- `write_file` - Create or completely rewrite files
- `replace_in_file` - Make targeted text replacements (efficient for large files)
- `search_in_file` - Search for patterns without reading full file
- `get_file_info` - Get file metadata (size, line count, preview)
- `list_files` - List all markdown files in vault or specific folder
- `rename_file` - Rename or move files to different locations
- `delete_file` - Delete files from the vault (moves to trash)

### Advanced Features
- **Automatic Retry Logic**: Handles API overload errors with exponential backoff (1s → 2s → 4s)
- **Token Management**: Aggressive conversation history truncation to prevent rate limits
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
- Clear conversation history regularly
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
3. Press Enter or click "Send"
4. Claude will respond in the chat area
5. Copy responses using the copy button (top or bottom of message)

### File Operations

**Reading Files**:
```
Read workspace-guide.md
```

**Editing Files**:
```
Make the word "important" bold in my active file
```

**Creating Files**:
```
Create a new file called "meeting-notes.md" with a template for meeting notes
```

**Searching Files**:
```
Search for all instances of "TODO" in my project notes
```

**Getting File Info** (for large files):
```
Show me information about workspace-guide.md without reading the full file
```

### Efficient Workflows

For **large files**, Claude will automatically:
1. Check file size first
2. Use `get_file_info` to preview content
3. Use `search_in_file` to find specific sections
4. Use `replace_in_file` for targeted edits (instead of rewriting entire file)

### Clearing History

Click "Clear History" button to remove all conversation history. This:
- Frees up tokens for future requests
- Reduces API costs
- Starts a fresh conversation context

## ⚙️ Configuration

### Settings

**Anthropic API Key**: Your API key from console.anthropic.com (required)

**Model**: Choose your preferred Claude model
- **Claude Sonnet 4.5** (Default) - Best balance of speed and capability
- **Claude Haiku 4.5** - Fastest and cheapest
- **Claude Opus 4.1** - Most capable but expensive
- Other models also available

**Max Tokens**: Maximum response length (default: 4096)
- Higher values = longer responses but higher costs
- Range: 1024 - 8192

**Enable Prompt Caching**: Cache system prompts to reduce costs by 90% (default: off)
- Only works with paid API plans that support prompt caching
- Reduces input token costs for repeated content
- Enable this if you use the plugin frequently

## 🐛 Troubleshooting

### Error: "Rate limit exceeded"
**Cause**: Sending too many tokens too quickly (30,000 tokens/minute limit)

**Solutions**:
- Clear conversation history to reduce token usage
- Wait 1 minute before trying again
- Use smaller files or targeted operations
- Switch to Haiku model (uses fewer tokens)

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

## 🎯 Best Practices

### Token Efficiency
1. Use `search_in_file` instead of reading entire large files
2. Use `replace_in_file` for small edits instead of rewriting files
3. Clear conversation history after completing tasks
4. Enable prompt caching if you use the plugin frequently

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

**Version**: 1.0.0
**Author**: bodfather
**Repository**: https://github.com/bodfather/obsidian-claude-plugin
