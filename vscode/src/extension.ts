// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const YAML = require('js-yaml');

import { SteganologgerViewProvider } from './panels/StenagologgerViewProvider';
import { PDFDecoder, PNGDecoder, SVGDecoder, PGFDecoder } from './utils/decoder';
import { text } from 'stream/consumers';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let logger = vscode.window.createOutputChannel("Steganologger");

	const provider = new SteganologgerViewProvider(context.extensionUri, logger, context);

	function showDecoded(decoded:any, path:string) {
		logger.appendLine("Decoded: " + JSON.stringify(decoded));
		switch(decoded.type) {
			case 'json':
				provider.addJSON(JSON.parse(decoded.data), path);
				break;
			case 'yaml':
				let docs:{}[] = [];
				YAML.loadAll(decoded.data, function(doc:any) {
					docs.push(doc);
				});
				provider.addYAML(docs, path);
				break;
			case 'other':
				try {
					let json = JSON.parse(decoded.data);
					provider.addJSON(json, path);
					break;
				} catch (error) {
					console.log("Could not interpret as JSON, interpreting as text");
				}
			case 'text':
				provider.addText(decoded.data, path)
				break;
		}
	}

	let showInfoCommand = vscode.commands.registerCommand("steganologger.showInfo", async (uri: vscode.Uri) => {
		try {
			await vscode.workspace.fs.stat(uri); //all is fine
		} catch {
			vscode.window.showErrorMessage(`'${uri.toString(true)}': file does *not* exist`);
			return;
		}
		let path = uri.fsPath;
		logger.appendLine("Decoding from URI: " + uri.toString());
		let ext = uri.toString().substring(uri.toString().lastIndexOf(".")+1).toLowerCase()
		logger.appendLine(ext);
		if(ext == "png") {
			const decoder = new PNGDecoder(logger);
			decoder.decodePNG(path,(decoded:any) => {
				showDecoded(decoded,path);
			});
		} else if(ext == "pdf") {
			const decoder = new PDFDecoder(logger);
			decoder.decodePDF(path, (decoded:any) => {
				showDecoded(decoded, path);
			});
		} else if(ext == "svg") {
			const decoder = new SVGDecoder(logger);
			decoder.decodeSVG(path, (decoded:any) => {
				showDecoded(decoded,path);
			});
		} else if(ext == "pgf") {
			const decoder = new PGFDecoder(logger);
			decoder.decodePGF(path, (decoded:any) => {
				showDecoded(decoded,path);
			});
		}
	});

	/*const onDidChangeActiveTextEditor: (textEditor: vscode.TextEditor|undefined) => void = textEditor => {
		// there is nothing to open
		if (!textEditor) {
		  return
		}
		vscode.window.showInformationMessage("Opened!" + textEditor.document.uri.fsPath);
	  }
	  context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor)
	  )*/
	let clearCommand = vscode.commands.registerCommand("steganologger.clear", async () => provider.command("clear"));
	let removeTabCommand = vscode.commands.registerCommand("steganologger.removeTab", async () => provider.command("removeTab"));
	let compareCommand = vscode.commands.registerCommand("steganologger.toggleCompare", async() => provider.toggleCompare());
	let refreshTabCommand = vscode.commands.registerCommand("steganologger.refreshTab", async() => provider.command("refreshTab"));
	let refreshAllCommand = vscode.commands.registerCommand("steganologger.refreshAll", async() => provider.command("refreshAll"));
	
	context.subscriptions.push(showInfoCommand, clearCommand, removeTabCommand, compareCommand, refreshTabCommand, refreshAllCommand);

	vscode.commands.executeCommand('setContext', 'steganologger.supportedExtensions', ['.png', '.svg', '.pdf', '.pgf']);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SteganologgerViewProvider.viewType, provider));
}

// This method is called when your extension is deactivated
export function deactivate() {}
