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

	let decodePixels = function(pixels:number[], start:number, length:number) {
		let str = "";
		for(let i = start; i < start+length; i++) {
			for(let j = 0; j < 3; j++) {
				str += pixels[i*4+j]%2; //4 channels: rgba
			}
		}
		return str;
	};

	let decodePNG = function(pixels:number[]) {
		const CHECK = "01010110" + "0";
		//const CHECK = "0101101110" + "01";
		let binStr = decodePixels(pixels, 0,3);
		if(binStr !== CHECK) {
			logger.appendLine("Check at beginning of file failed. There is no information encoded.");
			logger.appendLine("Got check bits: " + binStr);
			vscode.window.showInformationMessage("There is no information encoded in this image (check key failed).");
			return "";
		}
		logger.appendLine("Found encoded information! Decoding...");

		let result = [];
		let loc = 1;
		while(true) {
			let binStr = decodePixels(pixels, loc*3, 3);
			let binInt = binStr.substring(0,8);
			result.push(parseInt(binInt,2));
			if(binStr.charAt(8)==='1') {
				break;
			}
			loc += 1;
		}

		let decoded = new TextDecoder().decode(new Uint8Array(result));
		return decoded;
	};

	const provider = new SteganologgerViewProvider(context.extensionUri, logger, context);

	let disp1 = vscode.commands.registerCommand("steganologger.showInfo", async (uri: vscode.Uri) => {
		let path = uri.fsPath;
		logger.appendLine("Decoding from URI: " + uri.toString());
		PNG.decode(path, (pixels:number[]) => {
			let decoded = decodePNG(pixels);
			logger.appendLine("Decoded: " + decoded);
			let json = JSON.parse(decoded);
			provider.addJSON(json, path);
		});
	});
	context.subscriptions.push(disp1);

	vscode.commands.executeCommand('setContext', 'steganologger.supportedExtensions', ['.png']);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SteganologgerViewProvider.viewType, provider));
}

// This method is called when your extension is deactivated
export function deactivate() {}

class SteganologgerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'steganologger.webview';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri:vscode.Uri,
		private readonly _logger:vscode.OutputChannel,
		private readonly _context:vscode.ExtensionContext
	) {
		this._logger.appendLine("constructing webview");
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken): void | Thenable<void> {
		this._logger.appendLine("Resolving webview");
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		webviewView.webview.html = this._getHTMLForWebview(webviewView.webview);
	}

	public addJSON(json:JSON, name:string) {
		if(this._view) {
			this._view.show?.(true);
			this._view.webview.postMessage({type: 'addJSON', json: json, name: name});
		}
	}

	private _getHTMLForWebview(webview: vscode.Webview) {
		
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'script.js'));
		const nonce = getNonce();
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset='UTF-8'>
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleUri}" rel="stylesheet">
				<title>Steganologger</title>
			</head>
			
			<body>
			<div class="tabs" id="tabcontainer">
				<pre id='json'>Nothing here yet :(</pre>
			</div>
			<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
