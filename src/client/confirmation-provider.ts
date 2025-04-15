import { UserConfirmationProvider, ToolExecutionDetails } from './types.js';
import { logger } from '../utils/logger.js';
import * as readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Default implementation of UserConfirmationProvider
 * Automatically approves tools in the allowedTools set,
 * and prompts for confirmation for other tools using logger's styling
 */
export class DefaultConfirmationProvider implements UserConfirmationProvider {
    private allowedTools: Set<string>;
    private rl: readline.Interface | null = null;

    constructor(allowedTools: Set<string>) {
        this.allowedTools = allowedTools;
    }

    /**
     * Request confirmation for executing a tool
     * @param details Details about the tool execution
     * @param callbacks Optional callbacks for customizing the confirmation flow
     * @returns Promise resolving to boolean indicating if execution is approved
     */
    async requestConfirmation(
        details: ToolExecutionDetails,
        callbacks?: {
            displayDetails?: (details: ToolExecutionDetails) => void;
            collectInput?: () => Promise<string | boolean>;
            parseResponse?: (response: any) => boolean;
        }
    ): Promise<boolean> {
        // If the tool is in the allowed list, automatically approve
        if (this.allowedTools.has(details.toolName)) {
            logger.debug(`Tool '${details.toolName}' is pre-approved for execution`);
            return true;
        }

        // Display tool call using the logger's built-in method
        logger.toolCall(details.toolName, details.args);

        // Collect user input with arrow key navigation
        return await this.collectArrowKeyInput();
    }

    /**
     * !!!! This is an AI-generated sloppy implementation, TODO: REFACTOR THIS !!!
     * @returns Promise resolving to boolean (true for approve, false for deny)
     */
    private collectArrowKeyInput(): Promise<boolean> {
        return new Promise((resolve) => {
            // Configure readline for raw input
            readline.emitKeypressEvents(process.stdin);
            if (process.stdin.isTTY) {
                process.stdin.setRawMode(true);
            }

            // Set initial selection (default to No/Deny for safety)
            let selection = false;

            // Display confirmation options
            console.log(
                boxen(
                    `${chalk.cyan('Confirm execution of this tool?')}\n\n` +
                    `Use ${chalk.yellow('←/→')} arrow keys to select, ${chalk.yellow('Enter')} to confirm`,
                    {
                        padding: 1,
                        borderColor: 'yellow',
                        title: '🔐 Tool Confirmation',
                        titleAlignment: 'center'
                    }
                )
            );

            // Initial render of options
            this.renderSelection(selection);

            // Handle keypress events
            const keypressHandler = (str: string, key: readline.Key) => {
                // Handle left/right arrow keys
                if (key.name === 'left') {
                    selection = true; // Left = Approve
                    this.renderSelection(selection);
                }
                else if (key.name === 'right') {
                    selection = false; // Right = Deny
                    this.renderSelection(selection);
                }
                // Handle Enter key to confirm selection
                else if (key.name === 'return') {
                    // Clean up
                    process.stdin.removeListener('keypress', keypressHandler);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(false);
                    }

                    // Display confirmation result
                    console.log(
                        boxen(
                            selection ?
                                chalk.green('Tool execution approved') :
                                chalk.red('Tool execution denied'),
                            {
                                padding: 1,
                                borderColor: selection ? 'green' : 'red',
                                title: selection ? '✅ Approved' : '❌ Denied',
                                titleAlignment: 'center'
                            }
                        )
                    );

                    // Resolve with selection
                    resolve(selection);
                }
                // Handle Ctrl+C to abort
                else if (key.ctrl && key.name === 'c') {
                    // Clean up
                    process.stdin.removeListener('keypress', keypressHandler);
                    if (process.stdin.isTTY) {
                        process.stdin.setRawMode(false);
                    }

                    console.log(
                        boxen(
                            chalk.red('Tool execution aborted'),
                            {
                                padding: 1,
                                borderColor: 'red',
                                title: '❌ Aborted',
                                titleAlignment: 'center'
                            }
                        )
                    );

                    // Resolve with false (deny)
                    resolve(false);
                }
            };

            // Register keypress handler
            process.stdin.on('keypress', keypressHandler);
        });
    }

    /**
     * Render the current selection state with a horizontal layout
     * @param selection Current selection (true = approve, false = deny)
     */
    private renderSelection(selection: boolean): void {
        // Clear previous line
        process.stdout.write('\r\x1b[K');
        // Render current selection with horizontal layout
        if (selection) {
            process.stdout.write(`${chalk.green('▶')}${chalk.green.bold('Approve')}   ${chalk.gray('Deny')}`);
        } else {
            process.stdout.write(` ${chalk.gray('Approve')}  ${chalk.red('▶')}${chalk.red.bold('Deny')}`);
        }
    }


    /**
     * Close the readline interface if it's open
     */
    close(): void {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }
}
