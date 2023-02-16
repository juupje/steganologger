// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
const PNG = require('png-js');
const fs = require('fs');


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
		for(let i = start; i < start+length; i++) {
			for(let j = 0; j < 3; j++) {
				str += pixels[i*4+j]%2; //4 channels: rgba
			}
			//str += "\n";
		}
		logger.appendLine(str);
		return str;
	};

	function asDecimal (bStr: Binary): number {
		return parseInt(bStr, 2);
	}	  

	let decodePNG = function(pixels:number[]) {
		const CHECK = "01010110" + "0";
		//const CHECK = "0101101110" + "01";
		let binStr = decodePixels(pixels, 0,3);
		if(binStr !== CHECK) {
			logger.appendLine("Check at beginning of file failed. There is no information encoded.");
			logger.appendLine("Got check bits: " + binStr);
			return "";
		}
		logger.appendLine("Found encoded information! Decoding...");

		let result = [];
		let loc = 1;
		while(true) {
			let binStr = decodePixels(pixels, loc*3, 3);
			logger.appendLine(""+binStr);
			let binInt = binStr.substring(0,8);
			result.push(parseInt(binInt,2));
			if(binStr.charAt(8)==='1') {
				break;
			}
			loc += 1;
		}

		let decoded = new TextDecoder().decode(new Uint8Array(result));
		logger.appendLine(decoded);
		return decoded;
	};

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disp1 = vscode.commands.registerCommand("steganologger.showInfo", async (uri: vscode.Uri) => {
		let path = uri.fsPath;
		logger.appendLine("Decoding from URI: " + uri.toString());
		let imguri = vscode.Uri.parse("stegano:"+path);
		let doc = await vscode.workspace.openTextDocument(imguri); // callback to document provider
		await vscode.window.showTextDocument(doc, { preview: false});
	});
	context.subscriptions.push(disp1);

	let disp2 = vscode.commands.registerCommand("steganologger.decodeImage", (uri: vscode.Uri) => {
		let path = uri.fsPath;
		console.log(uri.toString());
		let decoded = "";
		logger.appendLine("command");
		let png = PNG.load(path);
		let pixels2 = png.decodePixels((pixels:number[]) => {
			logger.appendLine("something "+pixels);
			return pixels;
		});
		logger.appendLine(pixels2);
		PNG.decode(path, (pixels:number[]) => {
			decoded = decodePNG(pixels);
			logger.appendLine("Decoded: " + decoded);
		});
		logger.appendLine("Got now: " + decoded);
		return decoded;
	});
	context.subscriptions.push(disp2);

	const myProvider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
			logger.appendLine("Provider");
			/*return vscode.commands.executeCommand<string>("steganologger.decodeImage", uri).then(decoded => {
				logger.appendLine("Yes: " + decoded);
				return decoded;
			});*/
			let myPromise = new Promise<string>((resolve, reject) => {
				let path = uri.fsPath;
				console.log(uri.toString());
				let decoded = "";
				PNG.decode(path, (pixels:number[]) => {
					decoded = decodePNG(pixels);
					logger.appendLine("Decoded: " + decoded);
					let str = JSON.stringify(JSON.parse(decoded),undefined,2);
					resolve(str);
				});
			});
			return myPromise;
		}
	})();
	vscode.workspace.registerTextDocumentContentProvider("stegano", myProvider);

	vscode.commands.executeCommand('setContext', 'stenagologger.supportedExtensions', ['.png', '.svg']);
}

// This method is called when your extension is deactivated
export function deactivate() {}
