// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
const PNG = require('png-js');
const fs = require('fs');
import { SteganologgerViewProvider } from './panels/StenagologgerViewProvider';
import { PNGDecoder } from './utils/decoder';

type Binary<N extends number = number> = string & {
	readonly binaryStringLength: unique symbol;
	length: N;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let logger = vscode.window.createOutputChannel("Steganologger");

	const decoder = new PNGDecoder(logger);
	const provider = new SteganologgerViewProvider(context.extensionUri, logger, context);

	let showInfoCommand = vscode.commands.registerCommand("steganologger.showInfo", async (uri: vscode.Uri) => {
		try {
			await vscode.workspace.fs.stat(uri); //all is fine
		} catch {
			vscode.window.showErrorMessage(`'${uri.toString(true)}': file does *not* exist`);
			return;
		}
		let path = uri.fsPath;
		logger.appendLine("Decoding from URI: " + uri.toString());
		PNG.decode(path, (pixels:number[]) => {
			let decoded = decoder.decodePNG(pixels);
			logger.appendLine("Decoded: " + decoded);
			let json = JSON.parse(decoded);
			provider.addJSON(json, path);
		});
	});

	let clearCommand = vscode.commands.registerCommand("steganologger.clear", async () => provider.command("clear"));
	let removeTabCommand = vscode.commands.registerCommand("steganologger.removeTab", async () => provider.command("removeTab"));
	let compareCommand = vscode.commands.registerCommand("steganologger.toggleCompare", async() => provider.toggleCompare());
	let refreshTabCommand = vscode.commands.registerCommand("steganologger.refreshTab", async() => provider.command("refreshTab"));
	let refreshAllCommand = vscode.commands.registerCommand("steganologger.refreshAll", async() => provider.command("refreshAll"));

	context.subscriptions.push(showInfoCommand, clearCommand, removeTabCommand, compareCommand, refreshTabCommand, refreshAllCommand);

	vscode.commands.executeCommand('setContext', 'steganologger.supportedExtensions', ['.png']);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SteganologgerViewProvider.viewType, provider));
}

// This method is called when your extension is deactivated
export function deactivate() {}
