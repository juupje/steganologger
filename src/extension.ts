// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const PNG = require('png-js');


type Binary<N extends number = number> = string & {
	readonly binaryStringLength: unique symbol;
	length: N;
};

function assertIsBinaryString <L extends number>(
	str: string,
	length?: L,
  ): asserts str is Binary<L> {};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let logger = vscode.window.createOutputChannel("Steganologger");
	logger.appendLine('Congratulations, your extension "steganologger" is now active!');

	let decodePixels = function(pixels:number[], start:number, length:number) {
		let str = "";
		let count = 0;
		let i = start-1;
		while(count < length) {
			i += 1;
			if(i%4===3) { continue;}
			str += pixels[i]%2;
			count += 1;
		}
		return str;
	};

	let decodePNG = function(pixels:number[]) {
		const N = 3; //the first 3 pixel values will be decoded
		const CHECK = "010100101";
		const C = 4; // number of channels (r,g,b,a)
		let binStr = decodePixels(pixels, 0,9);
		if(binStr !== CHECK) {
			logger.appendLine("Check at beginning of file failed. There is no information encoded.");
			logger.appendLine("Got check bits: " + binStr);
			return;
		}
		logger.appendLine("Found encoded information! Decoding...");

		vscode.window.showInformationMessage("#pixels: " + pixels.length);
	};

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disp1 = vscode.commands.registerCommand("steganologger.decodeInfoInImage", (uri: vscode.Uri) => {
		let path = uri.fsPath;
		console.log(uri.toString());
		PNG.decode(path, decodePNG);
	});

	context.subscriptions.push(disp1);

	vscode.commands.executeCommand('setContext', 'stenagologger.supportedExtensions', ['.png', '.svg']);
}

// This method is called when your extension is deactivated
export function deactivate() {}
