import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, requestUrl } from 'obsidian';

interface ClaudePluginSettings {
    apiKey: string;
    model: string;
    maxTokens: number;
    enablePromptCaching: boolean;
}

const DEFAULT_SETTINGS: ClaudePluginSettings = {
    apiKey: '',
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    enablePromptCaching: false
}

interface MessageParam {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
}

interface ContentBlock {
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: string;
}

interface Tool {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
    };
}

export default class ClaudePlugin extends Plugin {
    settings: ClaudePluginSettings;

    getTools(): Tool[] {
        return [
            {
                name: 'read_file',
                description: 'Read the contents of a file in the vault. Use this when you need to see what is in a file. For large files, consider using search_in_file or get_file_info first.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the file relative to the vault root (e.g., "workspace-guide.md" or "folder/note.md")'
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'search_in_file',
                description: 'Search for a specific text pattern in a file without reading the entire file. Returns matching lines with context. Very efficient for large files.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the file to search in'
                        },
                        pattern: {
                            type: 'string',
                            description: 'The text pattern to search for (case-insensitive)'
                        }
                    },
                    required: ['path', 'pattern']
                }
            },
            {
                name: 'get_file_info',
                description: 'Get metadata about a file (size, line count, first/last lines) without reading the full content. Use this to check if a file is large before reading it.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the file'
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'replace_in_file',
                description: 'Make a targeted replacement in a file without rewriting the entire file. More efficient than read+write for small edits.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the file'
                        },
                        old_text: {
                            type: 'string',
                            description: 'The exact text to find and replace'
                        },
                        new_text: {
                            type: 'string',
                            description: 'The text to replace it with'
                        }
                    },
                    required: ['path', 'old_text', 'new_text']
                }
            },
            {
                name: 'write_file',
                description: 'Write content to a file, creating it if it does not exist or replacing its contents if it does. Use replace_in_file for small edits to large files.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path where the file should be written'
                        },
                        content: {
                            type: 'string',
                            description: 'The complete content to write to the file'
                        }
                    },
                    required: ['path', 'content']
                }
            },
            {
                name: 'list_files',
                description: 'List all markdown files in the vault or in a specific folder.',
                input_schema: {
                    type: 'object',
                    properties: {
                        folder: {
                            type: 'string',
                            description: 'Optional folder path to list files from. If not provided, lists all files in the vault.'
                        }
                    },
                    required: []
                }
            },
            {
                name: 'rename_file',
                description: 'Rename or move a file to a new path. Use this to rename files or move them to different folders.',
                input_schema: {
                    type: 'object',
                    properties: {
                        old_path: {
                            type: 'string',
                            description: 'The current path of the file'
                        },
                        new_path: {
                            type: 'string',
                            description: 'The new path for the file (can be in a different folder)'
                        }
                    },
                    required: ['old_path', 'new_path']
                }
            },
            {
                name: 'delete_file',
                description: 'Delete a file from the vault. Use with caution - this cannot be easily undone unless the vault is backed up or version controlled.',
                input_schema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The path to the file to delete'
                        }
                    },
                    required: ['path']
                }
            }
        ];
    }

    async onload() {
        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('bot', 'Open Claude Chat', () => {
            this.activateView();
        });

        // Add command to open Claude chat
        this.addCommand({
            id: 'open-claude-chat',
            name: 'Open Claude Chat',
            callback: () => {
                this.activateView();
            }
        });

        // Add command to ask Claude about current file
        this.addCommand({
            id: 'ask-claude-about-file',
            name: 'Ask Claude about current file',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const content = editor.getValue();
                const fileName = view.file?.name || 'current file';
                
                const modal = new ClaudeQuickModal(
                    this.app,
                    this,
                    `Asking about ${fileName}`,
                    content
                );
                modal.open();
            }
        });

        // Register view
        this.registerView(
            'claude-chat-view',
            (leaf) => new ClaudeChatView(leaf, this)
        );

        // Add settings tab
        this.addSettingTab(new ClaudeSettingTab(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType('claude-chat-view');

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: 'claude-chat-view', active: true });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async executeTool(toolName: string, input: any): Promise<string> {
        try {
            switch (toolName) {
                case 'read_file':
                    const file = this.app.vault.getAbstractFileByPath(input.path);
                    if (!file || !(file instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }
                    const content = await this.app.vault.read(file);

                    // If file is very large, return a truncated version with warning
                    const MAX_FILE_SIZE = 50000; // characters
                    if (content.length > MAX_FILE_SIZE) {
                        const truncated = content.substring(0, MAX_FILE_SIZE);
                        return `[WARNING: File is very large (${content.length} characters). Showing first ${MAX_FILE_SIZE} characters to avoid rate limits. For large files, consider using search_in_file or get_file_info instead.]\n\n${truncated}\n\n[... ${content.length - MAX_FILE_SIZE} characters truncated ...]`;
                    }

                    return content;

                case 'search_in_file':
                    const searchFile = this.app.vault.getAbstractFileByPath(input.path);
                    if (!searchFile || !(searchFile instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }
                    const searchContent = await this.app.vault.read(searchFile);
                    const lines = searchContent.split('\n');
                    const pattern = input.pattern.toLowerCase();
                    const matches: string[] = [];

                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(pattern)) {
                            matches.push(`Line ${index + 1}: ${line}`);
                        }
                    });

                    if (matches.length === 0) {
                        return `No matches found for "${input.pattern}" in ${input.path}`;
                    }
                    return `Found ${matches.length} matches in ${input.path}:\n\n${matches.join('\n')}`;

                case 'get_file_info':
                    const infoFile = this.app.vault.getAbstractFileByPath(input.path);
                    if (!infoFile || !(infoFile instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }
                    const infoContent = await this.app.vault.read(infoFile);
                    const infoLines = infoContent.split('\n');
                    const firstLines = infoLines.slice(0, 5).join('\n');
                    const lastLines = infoLines.slice(-5).join('\n');

                    return `File: ${input.path}
Size: ${infoContent.length} characters
Lines: ${infoLines.length}

First 5 lines:
${firstLines}

Last 5 lines:
${lastLines}`;

                case 'replace_in_file':
                    const replaceFile = this.app.vault.getAbstractFileByPath(input.path);
                    if (!replaceFile || !(replaceFile instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }
                    const replaceContent = await this.app.vault.read(replaceFile);

                    if (!replaceContent.includes(input.old_text)) {
                        return `Error: Text not found in file. Could not find: "${input.old_text}"`;
                    }

                    const newContent = replaceContent.replace(input.old_text, input.new_text);
                    await this.app.vault.modify(replaceFile, newContent);
                    return `Successfully replaced text in ${input.path}`;

                case 'write_file':
                    // Check if file exists
                    const existingFile = this.app.vault.getAbstractFileByPath(input.path);
                    if (existingFile && existingFile instanceof TFile) {
                        await this.app.vault.modify(existingFile, input.content);
                        return `Successfully updated file: ${input.path}`;
                    } else {
                        await this.app.vault.create(input.path, input.content);
                        return `Successfully created file: ${input.path}`;
                    }

                case 'list_files':
                    const files = this.app.vault.getMarkdownFiles();
                    let filteredFiles = files;
                    if (input.folder) {
                        filteredFiles = files.filter(f => f.path.startsWith(input.folder));
                    }
                    return filteredFiles.map(f => f.path).join('\n');

                case 'rename_file':
                    const fileToRename = this.app.vault.getAbstractFileByPath(input.old_path);
                    if (!fileToRename || !(fileToRename instanceof TFile)) {
                        return `Error: File not found: ${input.old_path}`;
                    }

                    // Check if new path already exists
                    const existingAtNewPath = this.app.vault.getAbstractFileByPath(input.new_path);
                    if (existingAtNewPath) {
                        return `Error: A file already exists at: ${input.new_path}`;
                    }

                    await this.app.fileManager.renameFile(fileToRename, input.new_path);
                    return `Successfully renamed "${input.old_path}" to "${input.new_path}"`;

                case 'delete_file':
                    const fileToDelete = this.app.vault.getAbstractFileByPath(input.path);
                    if (!fileToDelete || !(fileToDelete instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }

                    // Delete the file (moves to Obsidian trash if enabled)
                    await this.app.vault.trash(fileToDelete, true);
                    return `Successfully deleted: ${input.path}`;

                default:
                    return `Error: Unknown tool: ${toolName}`;
            }
        } catch (error) {
            return `Error executing ${toolName}: ${error.message}`;
        }
    }

    async callClaude(messages: MessageParam[], systemPrompt?: string, tools?: Tool[], onRetry?: (attempt: number, delay: number) => void): Promise<any> {
        if (!this.settings.apiKey) {
            throw new Error('Claude API key not configured');
        }

        const requestBody: any = {
            model: this.settings.model,
            max_tokens: this.settings.maxTokens,
            messages: messages
        };

        // Add system prompt with optional caching
        if (systemPrompt && systemPrompt.trim()) {
            if (this.settings.enablePromptCaching) {
                // Use prompt caching for system prompt (reduces costs by 90%)
                requestBody.system = [
                    {
                        type: 'text',
                        text: systemPrompt,
                        cache_control: { type: 'ephemeral' }
                    }
                ];
            } else {
                // Standard system prompt without caching
                requestBody.system = systemPrompt;
            }
        }

        // Add tools if provided
        if (tools && tools.length > 0) {
            requestBody.tools = tools;
        }

        // Retry logic with exponential backoff
        const maxRetries = 3;
        const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

        const makeRequest = async (attemptNumber: number): Promise<any> => {
            // Debug logging
            console.log(`=== Claude API Request (Attempt ${attemptNumber}/${maxRetries + 1}) ===`);
            console.log('URL:', 'https://api.anthropic.com/v1/messages');
            console.log('Model:', requestBody.model);
            console.log('Max Tokens:', requestBody.max_tokens);
            console.log('Messages:', JSON.stringify(messages, null, 2));
            console.log('System Prompt:', systemPrompt ? systemPrompt.substring(0, 100) + '...' : 'none');
            console.log('API Key (first 20 chars):', this.settings.apiKey.substring(0, 20) + '...');
            if (attemptNumber === 1) {
                console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
            }

            let response;
            try {
                response = await requestUrl({
                    url: 'https://api.anthropic.com/v1/messages',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.settings.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(requestBody),
                    throw: false  // Don't throw on non-200 status
                });

                console.log('=== Claude API Response ===');
                console.log('Status:', response.status);
                console.log('Headers:', response.headers);
                console.log('Response text:', response.text);
                console.log('Response JSON:', response.json);

                // Check for error status
                if (response.status !== 200) {
                    let errorMessage = 'Unknown error';
                    const errorData = response.json || (response.text ? JSON.parse(response.text) : null);
                    console.error('=== Claude API Error Response ===');
                    console.error('Error data:', JSON.stringify(errorData, null, 2));

                    if (errorData && errorData.error) {
                        errorMessage = errorData.error.message || JSON.stringify(errorData.error);
                    } else if (errorData && errorData.message) {
                        errorMessage = errorData.message;
                    } else if (response.text) {
                        errorMessage = response.text;
                    }

                    // Check if this is a retryable error (529 - Overloaded)
                    if (response.status === 529 && attemptNumber <= maxRetries) {
                        const delay = retryDelays[attemptNumber - 1];
                        console.log(`API overloaded (529), retrying in ${delay}ms (attempt ${attemptNumber}/${maxRetries})...`);

                        // Call onRetry callback if provided
                        if (onRetry) {
                            onRetry(attemptNumber, delay);
                        }

                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, delay));

                        // Retry
                        return makeRequest(attemptNumber + 1);
                    }

                    throw new Error(`Claude API Error (${response.status}): ${errorMessage}`);
                }

                const data = response.json;

                // Return the full response data so we can handle tool use
                return data;
            } catch (error) {
                // Log detailed error for debugging
                console.error('=== Claude API Error (catch block) ===');
                console.error('Error object:', error);
                console.error('Error type:', typeof error);
                console.error('Error keys:', Object.keys(error));

                // Log all properties of the error
                for (const key in error) {
                    console.error(`Error.${key}:`, error[key]);
                }

                // If we already formatted the error above, just re-throw it
                if (error.message && error.message.startsWith('Claude API Error')) {
                    throw error;
                }

                throw new Error(`Unexpected error: ${error.message || String(error)}`);
            }
        };

        // Start with attempt 1
        return makeRequest(1);
    }
}

class ClaudeChatView extends ItemView {
    plugin: ClaudePlugin;
    chatContainer: HTMLElement;
    inputContainer: HTMLElement;
    inputArea: HTMLTextAreaElement;
    conversationHistory: MessageParam[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: ClaudePlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return 'claude-chat-view';
    }

    getDisplayText(): string {
        return 'Claude Chat';
    }

    getIcon(): string {
        return 'bot';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('claude-chat-container');

        // Chat display area
        this.chatContainer = container.createDiv({ cls: 'claude-chat-messages' });

        // Input area
        this.inputContainer = container.createDiv({ cls: 'claude-chat-input-container' });

        this.inputArea = this.inputContainer.createEl('textarea', {
            cls: 'claude-chat-input',
            attr: { placeholder: 'Ask Claude anything about your vault...' }
        });

        const buttonContainer = this.inputContainer.createDiv({ cls: 'claude-chat-buttons' });

        const attachButton = buttonContainer.createEl('button', { text: 'Attach Active File', cls: 'claude-attach-button' });
        const sendButton = buttonContainer.createEl('button', { text: 'Send', cls: 'mod-cta' });
        const clearButton = buttonContainer.createEl('button', { text: 'Clear History' });

        attachButton.addEventListener('click', () => this.attachActiveFile(this.inputArea));
        sendButton.addEventListener('click', () => this.sendMessage(this.inputArea));
        clearButton.addEventListener('click', () => this.clearHistory());

        this.inputArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(this.inputArea);
            }
        });
    }

    truncateToolResults(history: MessageParam[]): MessageParam[] {
        // Aggressive token management to prevent rate limits
        const MAX_TOOL_RESULT_LENGTH = 500;  // Reduced from 1000
        const MAX_TEXT_LENGTH = 2000;         // Limit for old assistant responses
        const MAX_HISTORY_LENGTH = 10;        // Keep only last 10 messages

        // First, limit the total history length
        let trimmedHistory = history;
        if (history.length > MAX_HISTORY_LENGTH) {
            // Keep only the last 10 messages
            trimmedHistory = history.slice(-MAX_HISTORY_LENGTH);
            console.log(`Trimmed conversation history from ${history.length} to ${MAX_HISTORY_LENGTH} messages`);
        }

        // Then, truncate content in older messages
        return trimmedHistory.map((msg, index) => {
            // Don't truncate the last 3 messages (increased from 2)
            if (index >= trimmedHistory.length - 3) {
                return msg;
            }

            // Check if this message contains tool results (array content)
            if (Array.isArray(msg.content)) {
                const truncatedContent = msg.content.map(block => {
                    if (block.type === 'tool_result' && block.content && block.content.length > MAX_TOOL_RESULT_LENGTH) {
                        return {
                            ...block,
                            content: block.content.substring(0, MAX_TOOL_RESULT_LENGTH) + '\n\n[... truncated to save tokens ...]'
                        };
                    }
                    return block;
                });
                return { ...msg, content: truncatedContent };
            }

            // Also truncate long text content in old assistant messages
            if (typeof msg.content === 'string' && msg.content.length > MAX_TEXT_LENGTH && msg.role === 'assistant') {
                return {
                    ...msg,
                    content: msg.content.substring(0, MAX_TEXT_LENGTH) + '\n\n[... previous response truncated to save tokens ...]'
                };
            }

            return msg;
        });
    }

    async sendMessage(inputArea: HTMLTextAreaElement) {
        const message = inputArea.value.trim();
        if (!message) return;

        if (!this.plugin.settings.apiKey) {
            new Notice('Please configure your Claude API key in settings');
            return;
        }

        inputArea.value = '';

        // Add to conversation history first to get the correct index
        this.conversationHistory.push({
            role: 'user',
            content: message
        });

        // Add user message to UI
        this.addMessageToUI('user', message);

        // Show loading indicator
        const loadingDiv = this.chatContainer.createDiv({ cls: 'claude-message claude-message-assistant' });
        loadingDiv.setText('Claude is thinking...');

        try {
            // Build system prompt with vault access tools
            const systemPrompt = this.buildSystemPrompt();
            const tools = this.plugin.getTools();

            // Tool use loop
            let continueLoop = true;
            let maxIterations = 10;
            let iterations = 0;

            console.log('=== Starting Tool Use Loop ===');

            while (continueLoop && iterations < maxIterations) {
                iterations++;
                console.log(`=== Loop Iteration ${iterations} ===`);
                console.log('Continue loop:', continueLoop);
                console.log('Conversation history length:', this.conversationHistory.length);

                // Truncate old tool results to save tokens
                const historyToSend = this.truncateToolResults(this.conversationHistory);

                console.log('Calling Claude API...');
                const response = await this.plugin.callClaude(
                    historyToSend,
                    systemPrompt,
                    tools,
                    (attempt, delay) => {
                        // Update UI during retries
                        loadingDiv.setText(`API is busy, retrying in ${delay / 1000}s... (Attempt ${attempt}/3)`);
                    }
                );

                console.log('=== Tool Loop Response ===');
                console.log('Stop reason:', response.stop_reason);
                console.log('Content blocks:', response.content);

                // Check stop reason
                if (response.stop_reason === 'end_turn') {
                    // Extract text from response
                    const textContent = response.content
                        .filter((block: ContentBlock) => block.type === 'text')
                        .map((block: ContentBlock) => block.text)
                        .join('\n');

                    loadingDiv.remove();
                    this.addMessageToUI('assistant', textContent);
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: response.content
                    });
                    continueLoop = false;

                } else if (response.stop_reason === 'tool_use') {
                    // Claude wants to use tools
                    loadingDiv.setText('Claude is using tools...');

                    // Add assistant's tool use to history
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: response.content
                    });

                    // Execute all tool calls
                    const toolResults: ContentBlock[] = [];
                    for (const block of response.content) {
                        if (block.type === 'tool_use') {
                            const result = await this.plugin.executeTool(block.name, block.input);
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: result
                            });

                            // Show tool execution in UI
                            this.addToolExecutionToUI(block.name, block.input, result);
                        }
                    }

                    // Add tool results to history
                    this.conversationHistory.push({
                        role: 'user',
                        content: toolResults
                    });

                    // Continue loop to get final response
                    loadingDiv.setText('Claude is processing results...');
                    console.log('Tool results added to history, continuing loop...');
                } else {
                    console.error('Unexpected stop_reason:', response.stop_reason);
                    throw new Error(`Unexpected stop reason: ${response.stop_reason}`);
                }
            }

            console.log('=== Exited Tool Loop ===');
            console.log('Final iterations:', iterations);
            console.log('Continue loop:', continueLoop);

            if (iterations >= maxIterations) {
                loadingDiv.remove();
                new Notice('Reached maximum tool use iterations');
            }

        } catch (error) {
            loadingDiv.remove();
            const errorMsg = error.message || String(error);

            // Provide specific error messages based on error type
            let friendlyMsg = '';
            let noticeMsg = '';

            if (errorMsg.includes('529') || errorMsg.includes('Overloaded')) {
                friendlyMsg = 'API is overloaded. All retry attempts failed.\n\nSuggestions:\n- Wait a minute and try again\n- The API is experiencing high traffic\n- Your request will work once servers are less busy';
                noticeMsg = 'API overloaded - please try again in a moment';
            } else if (errorMsg.includes('429') || errorMsg.includes('rate_limit_error') || errorMsg.includes('rate limit')) {
                friendlyMsg = 'Rate limit exceeded. You\'re sending too many tokens too quickly.\n\nSuggestions:\n- Clear conversation history (removes old messages)\n- Work with smaller files\n- Wait 1 minute before trying again\n- Switch to Claude Haiku (uses fewer tokens)';
                noticeMsg = 'Rate limit exceeded - wait a minute or clear history';
            } else if (errorMsg.includes('400')) {
                friendlyMsg = 'Invalid request sent to API.\n\nDetails: ' + errorMsg + '\n\nThis is usually a bug in the plugin. Please report it.';
                noticeMsg = 'Invalid API request - please report this bug';
            } else if (errorMsg.includes('401') || errorMsg.includes('authentication')) {
                friendlyMsg = 'API key is invalid or expired.\n\nSuggestions:\n- Check your API key in settings\n- Generate a new key at https://console.anthropic.com\n- Make sure you have credits available';
                noticeMsg = 'Invalid API key - check settings';
            } else if (errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
                friendlyMsg = 'Server error on Anthropic\'s side.\n\nSuggestions:\n- Wait a few minutes and try again\n- Check https://status.anthropic.com for outages\n- Your request was not processed';
                noticeMsg = 'Server error - try again in a few minutes';
            } else {
                friendlyMsg = 'Unexpected error occurred.\n\nDetails: ' + errorMsg + '\n\nIf this persists, please report it as a bug.';
                noticeMsg = 'Error: ' + errorMsg.substring(0, 50);
            }

            new Notice(noticeMsg);
            this.addMessageToUI('error', friendlyMsg);
        }
    }

    buildSystemPrompt(): string {
        const adapter = this.app.vault.adapter;
        const vaultPath = (adapter as any).basePath || 'Vault';
        const files = this.app.vault.getMarkdownFiles();
        const fileList = files.map((f: TFile) => f.path).slice(0, 100).join('\n');

        // Get active file info
        const activeFile = this.app.workspace.getActiveFile();
        let activeFileInfo = 'No file is currently open.';
        if (activeFile) {
            activeFileInfo = `Currently active file: ${activeFile.path}`;
        }

        return `You are Claude, integrated into Obsidian to help the user with their vault.

Vault location: ${vaultPath}
${activeFileInfo}

You have access to these tools to interact with the vault:
- read_file: Read the contents of any file
- write_file: Create new files or update existing ones
- list_files: List all files in the vault or in a specific folder

When the user asks you to make changes to files, you can use these tools directly to read and modify files. Always confirm what you've done after making changes.

Be helpful and proactive. When you need to see a file's contents or make edits, use the tools available to you.`;
    }

    addToolExecutionToUI(toolName: string, input: any, result: string) {
        const toolDiv = this.chatContainer.createDiv({
            cls: 'claude-tool-execution'
        });

        const toolHeader = toolDiv.createDiv({ cls: 'claude-tool-header' });
        toolHeader.setText(`🔧 ${toolName}`);

        const toolInput = toolDiv.createDiv({ cls: 'claude-tool-input' });
        toolInput.setText(`Input: ${JSON.stringify(input, null, 2)}`);

        const toolResult = toolDiv.createDiv({ cls: 'claude-tool-result' });
        const resultPreview = result.length > 200 ? result.substring(0, 200) + '...' : result;
        toolResult.setText(`Result: ${resultPreview}`);

        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    addMessageToUI(role: 'user' | 'assistant' | 'error', content: string) {
        const messageDiv = this.chatContainer.createDiv({
            cls: `claude-message claude-message-${role}`
        });

        const messageHeader = messageDiv.createDiv({ cls: 'claude-message-header' });
        const roleLabel = messageHeader.createDiv({ cls: 'claude-message-role' });
        roleLabel.setText(role === 'user' ? 'You' : role === 'assistant' ? 'Claude' : 'Error');

        // Add copy button for assistant messages (top)
        if (role === 'assistant') {
            const copyButtonTop = this.createCopyButton(content);
            messageHeader.appendChild(copyButtonTop);
        }

        const contentDiv = messageDiv.createDiv({ cls: 'claude-message-content' });
        contentDiv.setText(content);

        // Add copy button for assistant messages (bottom)
        if (role === 'assistant') {
            const messageFooter = messageDiv.createDiv({ cls: 'claude-message-footer' });
            const copyButtonBottom = this.createCopyButton(content);
            messageFooter.appendChild(copyButtonBottom);
        }

        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    createCopyButton(content: string): HTMLElement {
        const copyButton = document.createElement('button');
        copyButton.className = 'claude-copy-button';
        copyButton.setAttribute('aria-label', 'Copy message');

        // Use Obsidian's setIcon API instead of innerHTML for security
        const iconContainer = copyButton.createSpan();
        this.plugin.app.workspace.trigger('obsidian:icon-clicked');  // Ensure icon system is loaded

        // Create SVG elements using DOM API (safer than innerHTML)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        // Copy icon paths
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '9');
        rect.setAttribute('y', '9');
        rect.setAttribute('width', '13');
        rect.setAttribute('height', '13');
        rect.setAttribute('rx', '2');
        rect.setAttribute('ry', '2');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

        svg.appendChild(rect);
        svg.appendChild(path);
        iconContainer.appendChild(svg);

        copyButton.addEventListener('click', async () => {
            await navigator.clipboard.writeText(content);

            // Replace with checkmark icon (using DOM API)
            iconContainer.empty();
            const checkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            checkSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            checkSvg.setAttribute('width', '16');
            checkSvg.setAttribute('height', '16');
            checkSvg.setAttribute('viewBox', '0 0 24 24');
            checkSvg.setAttribute('fill', 'none');
            checkSvg.setAttribute('stroke', 'currentColor');
            checkSvg.setAttribute('stroke-width', '2');
            checkSvg.setAttribute('stroke-linecap', 'round');
            checkSvg.setAttribute('stroke-linejoin', 'round');

            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', '20 6 9 17 4 12');
            checkSvg.appendChild(polyline);
            iconContainer.appendChild(checkSvg);

            copyButton.classList.add('claude-copy-button-success');

            setTimeout(() => {
                // Restore copy icon
                iconContainer.empty();
                const restoreSvg = svg.cloneNode(true) as SVGElement;
                iconContainer.appendChild(restoreSvg);
                copyButton.classList.remove('claude-copy-button-success');
            }, 2000);
        });

        return copyButton;
    }


    async attachActiveFile(inputArea: HTMLTextAreaElement) {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No file is currently open');
            return;
        }

        const content = await this.plugin.app.vault.read(activeFile);
        const attachment = `\n\n[File: ${activeFile.path}]\n\`\`\`\n${content}\n\`\`\``;
        inputArea.value += attachment;
        new Notice(`Attached: ${activeFile.name}`);
    }

    clearHistory() {
        this.conversationHistory = [];
        this.chatContainer.empty();
        new Notice('Conversation history cleared');
    }

    async onClose() {
        // Cleanup
    }
}

class ClaudeQuickModal extends Modal {
    plugin: ClaudePlugin;
    prompt: string;
    fileContent: string;

    constructor(app: App, plugin: ClaudePlugin, prompt: string, fileContent: string) {
        super(app);
        this.plugin = plugin;
        this.prompt = prompt;
        this.fileContent = fileContent;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Ask Claude' });

        const inputArea = contentEl.createEl('textarea', {
            cls: 'claude-quick-input',
            attr: { placeholder: 'What do you want to know about this file?' }
        });

        const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
        const submitButton = buttonDiv.createEl('button', { text: 'Ask', cls: 'mod-cta' });

        submitButton.addEventListener('click', async () => {
            const question = inputArea.value.trim();
            if (!question) return;

            submitButton.disabled = true;
            submitButton.setText('Asking...');

            try {
                const response = await this.plugin.callClaude([{
                    role: 'user',
                    content: `File content:\n\n${this.fileContent}\n\nQuestion: ${question}`
                }]);

                contentEl.empty();
                contentEl.createEl('h2', { text: 'Claude\'s Response' });
                
                const responseDiv = contentEl.createDiv({ cls: 'claude-response' });
                responseDiv.setText(response);

                const closeButton = contentEl.createEl('button', { text: 'Close' });
                closeButton.addEventListener('click', () => this.close());

            } catch (error) {
                new Notice('Error: ' + error.message);
                submitButton.disabled = false;
                submitButton.setText('Ask');
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ClaudeSettingTab extends PluginSettingTab {
    plugin: ClaudePlugin;

    constructor(app: App, plugin: ClaudePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Claude Integration Settings' });

        new Setting(containerEl)
            .setName('Anthropic API Key')
            .setDesc('Your Anthropic API key')
            .addText(text => text
                .setPlaceholder('sk-ant-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Which Claude model to use')
            .addDropdown(dropdown => dropdown
                .addOption('claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5 (Best)')
                .addOption('claude-haiku-4-5-20251001', 'Claude Haiku 4.5 (Fast)')
                .addOption('claude-opus-4-1-20250805', 'Claude Opus 4.1 (Most Capable)')
                .addOption('claude-sonnet-4-20250514', 'Claude Sonnet 4')
                .addOption('claude-opus-4-20250514', 'Claude Opus 4')
                .addOption('claude-3-7-sonnet-20250219', 'Claude Sonnet 3.7')
                .addOption('claude-3-5-haiku-20241022', 'Claude Haiku 3.5')
                .addOption('claude-3-haiku-20240307', 'Claude Haiku 3')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('Maximum tokens per response')
            .addText(text => text
                .setValue(String(this.plugin.settings.maxTokens))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxTokens = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Enable Prompt Caching')
            .setDesc('Cache system prompts and tools to reduce token costs by up to 90%. Requires a paid Anthropic API plan with prompt caching enabled.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePromptCaching)
                .onChange(async (value) => {
                    this.plugin.settings.enablePromptCaching = value;
                    await this.plugin.saveSettings();
                }));
    }
}
