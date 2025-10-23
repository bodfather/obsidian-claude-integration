import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, ItemView, requestUrl, addIcon } from 'obsidian';

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
    enablePromptCaching: true  // Enabled by default - saves up to 90% on token costs
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
                description: 'List markdown files in the vault or in a specific folder. Returns up to 100 files. Use the search parameter to filter results.',
                input_schema: {
                    type: 'object',
                    properties: {
                        folder: {
                            type: 'string',
                            description: 'Optional folder path to list files from. If not provided, lists all files in the vault.'
                        },
                        search: {
                            type: 'string',
                            description: 'Optional search term to filter file names (case-insensitive). Example: "suffer" will match "Suffering.md"'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of files to return (default: 100, max: 200)'
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

        // Register custom Claude logo icon using Obsidian's addIcon API
        const iconSvg = `<svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" stroke="none" d="M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z"/>
        </svg>`;

        // Use Obsidian's addIcon function
        addIcon('claude-logo', iconSvg);

        // Add ribbon icon with custom Claude logo
        this.addRibbonIcon('claude-logo', 'Open Claude Chat', () => {
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

    truncateToolResult(result: string, maxSize: number = 10000): string {
        if (result.length <= maxSize) {
            return result;
        }
        const truncated = result.substring(0, maxSize);
        return `${truncated}\n\n[... Result truncated to ${maxSize} characters to save tokens. Original length: ${result.length} characters ...]`;
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

                    // Truncate result to max size
                    return this.truncateToolResult(content, 15000);

                case 'search_in_file':
                    const searchFile = this.app.vault.getAbstractFileByPath(input.path);
                    if (!searchFile || !(searchFile instanceof TFile)) {
                        return `Error: File not found: ${input.path}`;
                    }
                    const searchContent = await this.app.vault.read(searchFile);
                    const lines = searchContent.split('\n');
                    const pattern = input.pattern.toLowerCase();
                    const matches: string[] = [];

                    // Limit to first 50 matches to avoid token overload
                    let matchCount = 0;
                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(pattern) && matchCount < 50) {
                            matches.push(`Line ${index + 1}: ${line}`);
                            matchCount++;
                        }
                    });

                    if (matches.length === 0) {
                        return `No matches found for "${input.pattern}" in ${input.path}`;
                    }
                    const searchResult = `Found ${matchCount} matches in ${input.path}:\n\n${matches.join('\n')}`;
                    return this.truncateToolResult(searchResult, 5000);

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

                    // Filter by folder if specified
                    if (input.folder) {
                        filteredFiles = files.filter(f => f.path.startsWith(input.folder));
                    }

                    // Filter by search term if specified
                    if (input.search) {
                        const searchLower = input.search.toLowerCase();
                        filteredFiles = filteredFiles.filter(f =>
                            f.path.toLowerCase().includes(searchLower) ||
                            f.basename.toLowerCase().includes(searchLower)
                        );
                    }

                    // Apply limit (default 100, max 200)
                    const limit = Math.min(input.limit || 100, 200);
                    const limitedFiles = filteredFiles.slice(0, limit);

                    // Return with count information
                    const fileList = limitedFiles.map(f => f.path).join('\n');
                    if (filteredFiles.length > limit) {
                        return this.truncateToolResult(`Showing ${limit} of ${filteredFiles.length} files (use search parameter to narrow results):\n\n${fileList}`, 5000);
                    }
                    return this.truncateToolResult(`Found ${limitedFiles.length} file(s):\n\n${fileList}`, 5000);

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

interface AttachedFile {
    file: TFile;
    content: string;
}

class ClaudeChatView extends ItemView {
    plugin: ClaudePlugin;
    chatContainer: HTMLElement;
    inputContainer: HTMLElement;
    inputArea: HTMLTextAreaElement;
    conversationHistory: MessageParam[] = [];
    loadingMessageInterval: number | null = null;
    suggestionContainer: HTMLElement | null = null;
    selectedSuggestionIndex: number = -1;
    attachedFiles: AttachedFile[] = [];
    attachmentChipsContainer: HTMLElement | null = null;
    autocompleteTimeout: number | null = null;

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
        return 'claude-logo';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('claude-chat-container');

        // Chat display area
        this.chatContainer = container.createDiv({ cls: 'claude-chat-messages' });

        // Input area
        this.inputContainer = container.createDiv({ cls: 'claude-chat-input-container' });

        // Input row with textarea and send button
        const inputRow = this.inputContainer.createDiv({ cls: 'claude-input-row' });

        // Textarea wrapper for proper sizing
        const textareaWrapper = inputRow.createDiv({ cls: 'claude-textarea-wrapper' });
        this.inputArea = textareaWrapper.createEl('textarea', {
            cls: 'claude-chat-input',
            attr: { placeholder: 'Ask Claude anything... [[wikilinks]] reference files token-efficiently.' }
        });

        // Send button (Claude orange up arrow)
        const sendButton = inputRow.createEl('button', {
            cls: 'claude-send-button',
            attr: { 'aria-label': 'Send message' }
        });
        sendButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="28" x2="12" y2="0"></line><polyline points="0 13 12 0 24 13"></polyline></svg>`;
        // Attachment chips container (below input)
        this.attachmentChipsContainer = this.inputContainer.createDiv({ cls: 'claude-attachment-chips' });

        // Icon buttons row
        const iconButtonsRow = this.inputContainer.createDiv({ cls: 'claude-icon-buttons' });

        // Attach file icon
        const attachButton = iconButtonsRow.createEl('button', {
            cls: 'claude-icon-button',
            attr: { 'aria-label': 'Attach active file' }
        });
        attachButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>`;

        // Search vault icon
        const searchButton = iconButtonsRow.createEl('button', {
            cls: 'claude-icon-button',
            attr: { 'aria-label': 'Search vault' }
        });
        searchButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>`;

        // Clear history icon (trash with confirmation)
        const clearButton = iconButtonsRow.createEl('button', {
            cls: 'claude-icon-button claude-clear-button',
            attr: { 'aria-label': 'Clear conversation' }
        });
        clearButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        attachButton.addEventListener('click', () => this.attachActiveFile());
        searchButton.addEventListener('click', () => this.openVaultSearch());
        sendButton.addEventListener('click', () => this.sendMessage(this.inputArea));
        clearButton.addEventListener('click', () => {
            // Add confirmation for clear history
            if (this.conversationHistory.length > 0) {
                const modal = new Modal(this.plugin.app);
                modal.contentEl.createEl('h3', { text: 'Clear conversation history?' });
                modal.contentEl.createEl('p', { text: 'This will remove all messages from the current conversation. This cannot be undone.' });
                const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });
                const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
                const confirmBtn = buttonContainer.createEl('button', { text: 'Clear', cls: 'mod-warning' });
                cancelBtn.addEventListener('click', () => modal.close());
                confirmBtn.addEventListener('click', () => {
                    this.clearHistory();
                    modal.close();
                });
                modal.open();
            } else {
                new Notice('No conversation to clear');
            }
        });

        // Drag and drop support for Obsidian files
        this.inputArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.inputArea.classList.add('drag-over');
        });

        this.inputArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.inputArea.classList.remove('drag-over');
        });

        this.inputArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.inputArea.classList.remove('drag-over');

            // Get the dropped text (obsidian:// URL)
            const droppedText = e.dataTransfer?.getData('text/plain');

            if (droppedText && droppedText.startsWith('obsidian://open?')) {
                // Parse the obsidian:// URL to extract the file path
                const url = new URL(droppedText);
                const filePath = url.searchParams.get('file');

                if (filePath) {
                    // Decode the URL-encoded file path
                    let decodedPath = decodeURIComponent(filePath);

                    // Try to find the file - first as-is
                    let file = this.plugin.app.vault.getAbstractFileByPath(decodedPath);

                    // If not found, try adding .md extension
                    if (!file && !decodedPath.endsWith('.md')) {
                        file = this.plugin.app.vault.getAbstractFileByPath(decodedPath + '.md');
                    }

                    // If still not found, try searching by basename
                    if (!file) {
                        const basename = decodedPath.split('/').pop() || decodedPath;
                        const allFiles = this.plugin.app.vault.getMarkdownFiles();
                        const foundFile = allFiles.find(f => f.basename === basename || f.path === basename);
                        if (foundFile) {
                            file = foundFile;
                        }
                    }

                    if (file && file instanceof TFile) {
                        await this.attachFile(file);
                    } else {
                        new Notice(`File not found: ${decodedPath}`);
                    }
                }
            }
        });

        this.inputArea.addEventListener('keydown', (e) => {
            // Handle suggestion navigation
            if (this.suggestionContainer && this.suggestionContainer.style.display !== 'none') {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.navigateSuggestions(1);
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateSuggestions(-1);
                    return;
                } else if (e.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    this.selectCurrentSuggestion();
                    return;
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hideSuggestions();
                    return;
                }
            }

            // Normal Enter to send
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(this.inputArea);
            }
        });

        // Handle input changes for autocomplete (debounced)
        this.inputArea.addEventListener('input', () => {
            // Clear existing timeout
            if (this.autocompleteTimeout) {
                window.clearTimeout(this.autocompleteTimeout);
            }

            // Set new timeout - only trigger autocomplete after 150ms of no typing
            this.autocompleteTimeout = window.setTimeout(() => {
                this.handleAutocomplete();
            }, 150);
        });

        // Close suggestions when clicking outside
        this.inputArea.addEventListener('blur', () => {
            // Delay to allow click on suggestion
            setTimeout(() => this.hideSuggestions(), 200);
        });
    }

    handleAutocomplete() {
        const cursorPos = this.inputArea.selectionStart;
        const text = this.inputArea.value;

        // Find the start of current wikilink
        let wikilinkStart = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (text.substring(i, i + 2) === '[[') {
                wikilinkStart = i;
                break;
            }
            // Stop if we hit ]] or newline
            if (text[i] === '\n' || text.substring(i, i + 2) === ']]') {
                break;
            }
        }

        // Check if we're inside a wikilink
        if (wikilinkStart === -1) {
            this.hideSuggestions();
            return;
        }

        // Extract search query
        const searchStart = wikilinkStart + 2;
        let searchEnd = cursorPos;

        // Stop at | (alias separator) or ]]
        for (let i = searchStart; i < text.length; i++) {
            if (text[i] === '|' || text.substring(i, i + 2) === ']]') {
                searchEnd = i;
                break;
            }
        }

        const query = text.substring(searchStart, searchEnd).toLowerCase();

        // Only search if query is at least 2 characters to avoid loading all files
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Get matching files
        const files = this.plugin.app.vault.getMarkdownFiles();
        const matches = files
            .filter(f => {
                const basename = f.basename.toLowerCase();
                const path = f.path.toLowerCase();
                return basename.includes(query) || path.includes(query);
            })
            .slice(0, 10) // Limit to 10 suggestions
            .sort((a, b) => {
                // Prioritize files where basename starts with query
                const aStarts = a.basename.toLowerCase().startsWith(query);
                const bStarts = b.basename.toLowerCase().startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.basename.localeCompare(b.basename);
            });

        if (matches.length > 0) {
            this.showSuggestions(matches, wikilinkStart);
        } else {
            this.hideSuggestions();
        }
    }

    showSuggestions(files: TFile[], wikilinkStart: number) {
        // Create suggestion container if it doesn't exist
        if (!this.suggestionContainer) {
            this.suggestionContainer = this.inputContainer.createDiv({
                cls: 'claude-wikilink-suggestions'
            });
        }

        this.suggestionContainer.empty();
        this.selectedSuggestionIndex = -1;

        files.forEach((file, index) => {
            const suggestionItem = this.suggestionContainer!.createDiv({
                cls: 'claude-suggestion-item'
            });

            const title = suggestionItem.createDiv({ cls: 'claude-suggestion-title' });
            title.setText(file.basename);

            if (file.path !== file.basename + '.md') {
                const path = suggestionItem.createDiv({ cls: 'claude-suggestion-path' });
                path.setText(file.path);
            }

            suggestionItem.addEventListener('click', () => {
                this.insertSuggestion(file, wikilinkStart);
            });

            suggestionItem.addEventListener('mouseenter', () => {
                this.setSelectedSuggestion(index);
            });
        });

        this.suggestionContainer.style.display = 'block';
    }

    hideSuggestions() {
        if (this.suggestionContainer) {
            this.suggestionContainer.style.display = 'none';
        }
        this.selectedSuggestionIndex = -1;
    }

    navigateSuggestions(direction: number) {
        if (!this.suggestionContainer) return;

        const items = this.suggestionContainer.querySelectorAll('.claude-suggestion-item');
        if (items.length === 0) return;

        // Remove current selection
        if (this.selectedSuggestionIndex >= 0) {
            items[this.selectedSuggestionIndex].removeClass('is-selected');
        }

        // Update index
        this.selectedSuggestionIndex += direction;
        if (this.selectedSuggestionIndex < 0) {
            this.selectedSuggestionIndex = items.length - 1;
        } else if (this.selectedSuggestionIndex >= items.length) {
            this.selectedSuggestionIndex = 0;
        }

        // Add new selection
        items[this.selectedSuggestionIndex].addClass('is-selected');
        items[this.selectedSuggestionIndex].scrollIntoView({ block: 'nearest' });
    }

    setSelectedSuggestion(index: number) {
        if (!this.suggestionContainer) return;

        const items = this.suggestionContainer.querySelectorAll('.claude-suggestion-item');

        // Remove old selection
        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < items.length) {
            items[this.selectedSuggestionIndex].removeClass('is-selected');
        }

        // Set new selection
        this.selectedSuggestionIndex = index;
        if (index >= 0 && index < items.length) {
            items[index].addClass('is-selected');
        }
    }

    selectCurrentSuggestion() {
        if (!this.suggestionContainer || this.selectedSuggestionIndex < 0) return;

        const items = this.suggestionContainer.querySelectorAll('.claude-suggestion-item');
        if (this.selectedSuggestionIndex < items.length) {
            (items[this.selectedSuggestionIndex] as HTMLElement).click();
        }
    }

    insertSuggestion(file: TFile, wikilinkStart: number) {
        const text = this.inputArea.value;
        const cursorPos = this.inputArea.selectionStart;

        // Find the end of the current wikilink attempt
        let wikilinkEnd = cursorPos;
        for (let i = cursorPos; i < text.length; i++) {
            if (text.substring(i, i + 2) === ']]') {
                wikilinkEnd = i + 2;
                break;
            }
            if (text[i] === '\n') {
                break;
            }
        }

        // Replace with completed wikilink
        const before = text.substring(0, wikilinkStart);
        const after = text.substring(wikilinkEnd);
        const wikilink = `[[${file.basename}]]`;

        this.inputArea.value = before + wikilink + after;

        // Set cursor after the wikilink
        const newCursorPos = wikilinkStart + wikilink.length;
        this.inputArea.selectionStart = newCursorPos;
        this.inputArea.selectionEnd = newCursorPos;

        this.hideSuggestions();
        this.inputArea.focus();
    }

    async parseWikilinks(message: string): Promise<{enhancedMessage: string, warnings: string[]}> {
        // Detect wikilinks in the format [[filename]] or [[filename|display]]
        const wikilinkRegex = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
        const matches = [...message.matchAll(wikilinkRegex)];

        if (matches.length === 0) {
            return {enhancedMessage: message, warnings: []};
        }

        // Extract unique filenames
        const filenames = [...new Set(matches.map(match => match[1]))];

        const warnings: string[] = [];
        let enhanced = message + '\n\n';
        enhanced += `[Auto-attached ${filenames.length} file(s) from wikilinks]\n\n`;

        // Auto-read each wikilinked file
        for (const filename of filenames) {
            // Try to resolve the filename to a full path
            const resolvedPath = this.resolveWikilinkToPath(filename);

            if (!resolvedPath) {
                warnings.push(`⚠️ File not found: [[${filename}]]`);
                enhanced += `[File: ${filename} - NOT FOUND]\n\n`;
                continue;
            }

            // Read the file
            const file = this.plugin.app.vault.getAbstractFileByPath(resolvedPath);
            if (!file || !(file instanceof TFile)) {
                warnings.push(`⚠️ Could not read: [[${filename}]]`);
                enhanced += `[File: ${filename} - COULD NOT READ]\n\n`;
                continue;
            }

            try {
                const content = await this.plugin.app.vault.read(file);

                // Truncate if too large (same limit as read_file tool)
                const MAX_SIZE = 15000;
                if (content.length > MAX_SIZE) {
                    const truncated = content.substring(0, MAX_SIZE);
                    warnings.push(`⚠️ ${file.basename} truncated (${content.length} → ${MAX_SIZE} chars)`);
                    enhanced += `[File: ${file.path}]\n${truncated}\n\n[... File truncated to save tokens. Original size: ${content.length} characters ...]\n[End File: ${file.path}]\n\n`;
                } else {
                    enhanced += `[File: ${file.path}]\n${content}\n[End File: ${file.path}]\n\n`;
                }
            } catch (error) {
                warnings.push(`⚠️ Error reading [[${filename}]]: ${error.message}`);
                enhanced += `[File: ${filename} - ERROR: ${error.message}]\n\n`;
            }
        }

        return {enhancedMessage: enhanced, warnings};
    }

    resolveWikilinkToPath(filename: string): string | null {
        // Handle .md extension if not present
        const withExtension = filename.endsWith('.md') ? filename : filename + '.md';

        // Search for the file in the vault
        const files = this.plugin.app.vault.getMarkdownFiles();

        // Try exact match first
        let found = files.find(f => f.path === withExtension);
        if (found) return found.path;

        // Try matching just the basename
        found = files.find(f => f.basename === filename);
        if (found) return found.path;

        // Try case-insensitive match
        found = files.find(f =>
            f.basename.toLowerCase() === filename.toLowerCase()
        );
        if (found) return found.path;

        // Try partial match in path
        found = files.find(f => f.path.includes(filename));
        if (found) return found.path;

        return null;
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

        // Parse wikilinks and auto-attach files
        const {enhancedMessage, warnings} = await this.parseWikilinks(message);

        // Add manually attached files to the message
        let finalMessage = enhancedMessage;
        if (this.attachedFiles.length > 0) {
            finalMessage += '\n\n[Manually Attached Files]\n\n';
            for (const attachedFile of this.attachedFiles) {
                const truncated = this.plugin.truncateToolResult(attachedFile.content, 15000);
                finalMessage += `[File: ${attachedFile.file.path}]\n${truncated}\n[End File: ${attachedFile.file.path}]\n\n`;
            }
        }

        // Show warnings if any
        if (warnings.length > 0) {
            for (const warning of warnings) {
                new Notice(warning);
            }
        }

        // Add to conversation history first to get the correct index
        this.conversationHistory.push({
            role: 'user',
            content: finalMessage
        });

        // Add user message to UI (show original message, not enhanced)
        this.addMessageToUI('user', message);

        // Show detailed attachment info with file names
        const totalWikilinks = (enhancedMessage.match(/\[File:/g) || []).length;
        const totalManual = this.attachedFiles.length;
        const totalAttachments = totalWikilinks + totalManual;

        if (totalAttachments > 0) {
            const attachInfo = this.chatContainer.createDiv({
                cls: 'claude-attachment-info'
            });
            let infoText = `📎 Attached: `;

            // List manually attached files by name
            if (totalManual > 0) {
                const fileNames = this.attachedFiles.map(af => af.file.basename).join(', ');
                infoText += fileNames;
            }

            // Add wikilinked files count
            if (totalWikilinks > 0) {
                if (totalManual > 0) infoText += ' + ';
                infoText += `${totalWikilinks} wikilinked file(s)`;
            }

            attachInfo.setText(infoText);
        }

        // Clear attached files after sending
        this.attachedFiles = [];
        this.renderAttachmentChips();

        // Show loading indicator with animation
        const loadingDiv = this.chatContainer.createDiv({ cls: 'claude-message claude-message-assistant' });
        loadingDiv.setText('Claude is thinking...');
        this.startLoadingAnimation(loadingDiv);

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

                    this.stopLoadingAnimation();
                    loadingDiv.remove();
                    this.addMessageToUI('assistant', textContent);
                    this.conversationHistory.push({
                        role: 'assistant',
                        content: response.content
                    });
                    continueLoop = false;

                } else if (response.stop_reason === 'tool_use') {
                    // Claude wants to use tools
                    this.stopLoadingAnimation();
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
                    this.startLoadingAnimation(loadingDiv);
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
                this.stopLoadingAnimation();
                loadingDiv.remove();
                new Notice('Reached maximum tool use iterations');
            }

        } catch (error) {
            this.stopLoadingAnimation();
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

    getPlayfulLoadingMessages(): string[] {
        return [
            'Claude is thinking...',
            'Pondering the possibilities...',
            'Considering the options...',
            'Analyzing your request...',
            'Connecting the dots...',
            'Discombobulating...',
            'Clauding intensely...',
            'Consulting the vault...',
            'Organizing thoughts...',
            'Formulating a response...',
            'Processing...',
            'Thinking deeply...',
            'Reviewing the details...',
            'Almost there...',
            'Working on it...'
        ];
    }

    startLoadingAnimation(loadingDiv: HTMLElement) {
        const messages = this.getPlayfulLoadingMessages();
        let index = 0;

        // Clear any existing interval
        if (this.loadingMessageInterval) {
            window.clearInterval(this.loadingMessageInterval);
        }

        // Update message every 1.5 seconds
        this.loadingMessageInterval = window.setInterval(() => {
            index = (index + 1) % messages.length;
            loadingDiv.setText(messages[index]);
        }, 1500);
    }

    stopLoadingAnimation() {
        if (this.loadingMessageInterval) {
            window.clearInterval(this.loadingMessageInterval);
            this.loadingMessageInterval = null;
        }
    }

    buildSystemPrompt(): string {
        const adapter = this.app.vault.adapter;
        const vaultPath = (adapter as any).basePath || 'Vault';

        // Get active file info
        const activeFile = this.app.workspace.getActiveFile();
        let activeFileInfo = 'No file is currently open.';
        if (activeFile) {
            activeFileInfo = `Currently active file: ${activeFile.path}`;
        }

        return `You are Claude, integrated into Obsidian to help the user with their vault.

Vault location: ${vaultPath}
${activeFileInfo}

You have access to powerful tools to interact with the vault:
- read_file: Read the contents of any file (use this for each file individually)
- search_in_file: Search for patterns without reading entire files
- get_file_info: Check file size and preview before reading large files
- write_file: Create new files or update existing ones
- replace_in_file: Make targeted edits without rewriting entire files
- list_files: List all files in the vault or in a specific folder
- rename_file: Rename or move files
- delete_file: Delete files (use with caution)

CRITICAL PRIORITY RULES:
1. **ALWAYS prioritize explicitly attached files over active file context**
   - If you see [Manually Attached Files] or [[wikilinks]], use THOSE files
   - The active file is just context - don't assume the user wants you to work with it
   - When in doubt, ask which file the user wants you to use
2. If the user's message is unclear and files are attached, ask for clarification rather than making assumptions

IMPORTANT WORKFLOW TIPS:
1. When asked to work with multiple files, read them ONE AT A TIME using read_file
2. Don't ask the user to paste file contents - use read_file yourself
3. For large files, use get_file_info first to check the size
4. Use search_in_file to find specific content without reading entire files
5. Your tool calls are cached - reading the same file again is nearly free

When the user references [[wikilinks]], you will be given a list of file paths to read.
Be helpful and proactive. Use your tools to read, search, and modify files as needed.`;
    }

    addToolExecutionToUI(toolName: string, input: any, result: string) {
        // Create compact tool execution summary
        const toolDiv = this.chatContainer.createDiv({
            cls: 'claude-tool-execution'
        });

        // Format a clean, compact summary based on tool type
        let summary = '';
        switch (toolName) {
            case 'read_file':
                summary = `📄 Read: ${input.path}`;
                break;
            case 'write_file':
                summary = `✏️ Wrote: ${input.path}`;
                break;
            case 'replace_in_file':
                summary = `🔄 Edited: ${input.path}`;
                break;
            case 'delete_file':
                summary = `🗑️ Deleted: ${input.path}`;
                break;
            case 'rename_file':
                summary = `📝 Renamed: ${input.old_path} → ${input.new_path}`;
                break;
            case 'list_files':
                const fileCount = result.match(/Found (\d+)/)?.[1] || '?';
                summary = `📁 Listed ${fileCount} files`;
                break;
            case 'search_in_file':
                const matchCount = result.match(/Found (\d+)/)?.[1] || '0';
                summary = `🔍 Search in ${input.path}: ${matchCount} matches`;
                break;
            case 'get_file_info':
                summary = `ℹ️ File info: ${input.path}`;
                break;
            default:
                summary = `🔧 ${toolName}`;
        }

        toolDiv.setText(summary);
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


    openVaultSearch() {
        const modal = new VaultSearchModal(this.plugin.app, this.plugin, this);
        modal.open();
    }

    // Reusable method to attach any file
    async attachFile(file: TFile) {
        // Check if already attached
        if (this.attachedFiles.some(af => af.file.path === file.path)) {
            new Notice(`${file.name} is already attached`);
            return;
        }

        const content = await this.plugin.app.vault.read(file);

        // Add to attached files list
        this.attachedFiles.push({
            file: file,
            content: content
        });

        // Update chips display
        this.renderAttachmentChips();

        new Notice(`Attached: ${file.name}`);
    }

    async attachActiveFile() {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No file is currently open');
            return;
        }

        await this.attachFile(activeFile);
    }

    renderAttachmentChips() {
        if (!this.attachmentChipsContainer) return;

        this.attachmentChipsContainer.empty();

        if (this.attachedFiles.length === 0) {
            this.attachmentChipsContainer.style.display = 'none';
            return;
        }

        this.attachmentChipsContainer.style.display = 'flex';

        this.attachedFiles.forEach((attachedFile, index) => {
            const chip = this.attachmentChipsContainer!.createDiv({ cls: 'claude-attachment-chip' });

            // File icon and name
            const chipContent = chip.createDiv({ cls: 'claude-attachment-chip-content' });
            chipContent.createSpan({ text: '📄', cls: 'claude-attachment-icon' });
            chipContent.createSpan({ text: attachedFile.file.basename, cls: 'claude-attachment-name' });

            // File size info
            const sizeKB = Math.round(attachedFile.content.length / 1024);
            chipContent.createSpan({
                text: ` (${sizeKB}KB)`,
                cls: 'claude-attachment-size'
            });

            // Remove button
            const removeBtn = chip.createDiv({ cls: 'claude-attachment-remove', text: '×' });
            removeBtn.addEventListener('click', () => {
                this.attachedFiles.splice(index, 1);
                this.renderAttachmentChips();
                new Notice(`Removed: ${attachedFile.file.basename}`);
            });

            // Click to view file
            chipContent.addEventListener('click', () => {
                this.plugin.app.workspace.openLinkText(attachedFile.file.path, '', false);
            });
        });
    }

    clearHistory() {
        this.conversationHistory = [];
        this.chatContainer.empty();
        new Notice('Conversation history cleared');
    }

    async onClose() {
        // Cleanup
        this.stopLoadingAnimation();

        // Clear autocomplete timeout
        if (this.autocompleteTimeout) {
            window.clearTimeout(this.autocompleteTimeout);
            this.autocompleteTimeout = null;
        }
    }
}

interface SearchResult {
    file: TFile;
    line: number;
    lineText: string;
    contextBefore: string[];
    contextAfter: string[];
}

class VaultSearchModal extends Modal {
    plugin: ClaudePlugin;
    chatView: ClaudeChatView;
    searchInput: HTMLInputElement;
    resultsContainer: HTMLElement;
    searchResults: SearchResult[] = [];
    selectedResults: Set<number> = new Set();

    constructor(app: App, plugin: ClaudePlugin, chatView: ClaudeChatView) {
        super(app);
        this.plugin = plugin;
        this.chatView = chatView;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('claude-search-modal');

        contentEl.createEl('h2', { text: 'Search Vault' });

        // Search input
        const inputContainer = contentEl.createDiv({ cls: 'claude-search-input-container' });
        this.searchInput = inputContainer.createEl('input', {
            cls: 'claude-search-input',
            attr: { placeholder: 'Search for text in all files...', type: 'text' }
        });

        const searchButton = inputContainer.createEl('button', {
            text: 'Search',
            cls: 'mod-cta'
        });

        // Results container
        this.resultsContainer = contentEl.createDiv({ cls: 'claude-search-results' });

        // Action buttons
        const actionContainer = contentEl.createDiv({ cls: 'claude-search-actions' });
        const selectAllBtn = actionContainer.createEl('button', { text: 'Select All' });
        const deselectAllBtn = actionContainer.createEl('button', { text: 'Deselect All' });
        const sendButton = actionContainer.createEl('button', { text: 'Send to Claude', cls: 'mod-cta' });

        // Event listeners
        searchButton.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch();
            }
        });

        selectAllBtn.addEventListener('click', () => this.selectAll());
        deselectAllBtn.addEventListener('click', () => this.deselectAll());
        sendButton.addEventListener('click', () => this.sendToChat());

        // Focus the search input
        this.searchInput.focus();
    }

    performSearch() {
        const query = this.searchInput.value.trim().toLowerCase();
        if (!query) {
            new Notice('Please enter a search term');
            return;
        }

        this.searchResults = [];
        this.selectedResults.clear();

        const files = this.plugin.app.vault.getMarkdownFiles();

        // Search all files
        for (const file of files) {
            this.plugin.app.vault.read(file).then(content => {
                const lines = content.split('\n');

                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(query)) {
                        // Get context (3 lines before and after)
                        const contextBefore = lines.slice(Math.max(0, index - 3), index);
                        const contextAfter = lines.slice(index + 1, index + 4);

                        this.searchResults.push({
                            file,
                            line: index + 1,
                            lineText: line,
                            contextBefore,
                            contextAfter
                        });
                    }
                });

                // Update UI after each file is processed
                this.updateResults(query);
            });
        }

        // Show loading message
        this.resultsContainer.empty();
        this.resultsContainer.createDiv({ text: 'Searching...', cls: 'claude-search-loading' });
    }

    updateResults(query: string) {
        this.resultsContainer.empty();

        if (this.searchResults.length === 0) {
            this.resultsContainer.createDiv({
                text: 'No results found',
                cls: 'claude-search-no-results'
            });
            return;
        }

        // Group by file
        const byFile = new Map<string, SearchResult[]>();
        this.searchResults.forEach(result => {
            const path = result.file.path;
            if (!byFile.has(path)) {
                byFile.set(path, []);
            }
            byFile.get(path)!.push(result);
        });

        // Limit total results displayed
        const MAX_RESULTS = 50;
        let displayedCount = 0;

        byFile.forEach((results, filePath) => {
            if (displayedCount >= MAX_RESULTS) return;

            const fileGroup = this.resultsContainer.createDiv({ cls: 'claude-search-file-group' });

            // File header
            const fileHeader = fileGroup.createDiv({ cls: 'claude-search-file-header' });
            fileHeader.createSpan({ text: filePath, cls: 'claude-search-file-name' });
            fileHeader.createSpan({
                text: ` (${results.length} match${results.length > 1 ? 'es' : ''})`,
                cls: 'claude-search-match-count'
            });

            // Results for this file
            results.slice(0, 10).forEach((result, index) => {
                if (displayedCount >= MAX_RESULTS) return;

                const resultIndex = this.searchResults.indexOf(result);
                const resultItem = fileGroup.createDiv({ cls: 'claude-search-result-item' });

                // Checkbox
                const checkbox = resultItem.createEl('input', {
                    type: 'checkbox',
                    cls: 'claude-search-checkbox'
                });
                checkbox.checked = this.selectedResults.has(resultIndex);
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        this.selectedResults.add(resultIndex);
                    } else {
                        this.selectedResults.delete(resultIndex);
                    }
                });

                // Result content
                const resultContent = resultItem.createDiv({ cls: 'claude-search-result-content' });

                resultContent.createDiv({
                    text: `Line ${result.line}:`,
                    cls: 'claude-search-line-number'
                });

                // Show matching line with context
                const matchLine = resultContent.createDiv({ cls: 'claude-search-match-line' });
                matchLine.setText(result.lineText);

                displayedCount++;
            });

            if (results.length > 10) {
                fileGroup.createDiv({
                    text: `... and ${results.length - 10} more matches in this file`,
                    cls: 'claude-search-more'
                });
            }
        });

        if (displayedCount >= MAX_RESULTS) {
            this.resultsContainer.createDiv({
                text: `Showing first ${MAX_RESULTS} results. Refine your search for more specific matches.`,
                cls: 'claude-search-limit-notice'
            });
        }
    }

    selectAll() {
        this.selectedResults.clear();
        for (let i = 0; i < this.searchResults.length; i++) {
            this.selectedResults.add(i);
        }
        this.updateResults(this.searchInput.value.trim().toLowerCase());
    }

    deselectAll() {
        this.selectedResults.clear();
        this.updateResults(this.searchInput.value.trim().toLowerCase());
    }

    async sendToChat() {
        if (this.selectedResults.size === 0) {
            new Notice('Please select at least one result');
            return;
        }

        const query = this.searchInput.value.trim();

        // Build message with selected results
        let message = `[Search Results for "${query}" - ${this.selectedResults.size} match${this.selectedResults.size > 1 ? 'es' : ''} selected]\n\n`;

        // Group selected results by file
        const byFile = new Map<string, SearchResult[]>();
        this.selectedResults.forEach(index => {
            const result = this.searchResults[index];
            const path = result.file.path;
            if (!byFile.has(path)) {
                byFile.set(path, []);
            }
            byFile.get(path)!.push(result);
        });

        byFile.forEach((results, filePath) => {
            message += `[File: ${filePath}]\n`;

            results.forEach(result => {
                message += `\nLine ${result.line}:\n`;
                if (result.contextBefore.length > 0) {
                    message += result.contextBefore.join('\n') + '\n';
                }
                message += `>>> ${result.lineText}\n`;
                if (result.contextAfter.length > 0) {
                    message += result.contextAfter.join('\n') + '\n';
                }
            });

            message += `[End File: ${filePath}]\n\n`;
        });

        // Add to chat input
        this.chatView.inputArea.value = message;
        this.chatView.inputArea.focus();

        // Close modal
        this.close();

        new Notice(`Added ${this.selectedResults.size} search results to chat`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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
