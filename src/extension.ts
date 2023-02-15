// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const PNG = require('png-js');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let logger = vscode.window.createOutputChannel("Steganologger");
	logger.appendLine('Congratulations, your extension "steganologger" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disp1 = vscode.commands.registerCommand("steganologger.decodeInfoInImage", (uri: vscode.Uri) => {
		let path = uri.fsPath;
		console.log(uri.toString());
		PNG.decode(path, function(pixels:number[][]) {
			vscode.window.showInformationMessage("#pixels: " + pixels.length);
		});
	});

	context.subscriptions.push(disp1);

	vscode.commands.executeCommand('setContext', 'stenagologger.supportedExtensions', ['.png', '.svg']);
}

// This method is called when your extension is deactivated
export function deactivate() {}
