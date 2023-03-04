import * as vscode from 'vscode';
const PNG = require('png-js');
const fs = require('node:fs');

export class PNGDecoder {
    constructor(
        private readonly _logger:vscode.OutputChannel
    ) {}

    private decodePixels(pixels:number[], start:number, length:number) {
        let str = "";
        for(let i = start; i < start+length; i++) {
            for(let j = 0; j < 3; j++) {
                str += pixels[i*4+j]%2; //4 channels: rgba
            }
        }
        return str;
    }

    public decodePNG(path:string, func:Function) {
        this._logger.appendLine("Decoding PNG");
        const CHECKV1 = "01010110" + "0";
        const CHECKV2 = "01010111" + "0";
        PNG.decode(path, (pixels:number[]) => {
            let loc = 0;
            let binStr = this.decodePixels(pixels, loc*3,3);
            loc += 1;
            let version = 1;
            const types = ['other', 'json','yaml', 'text'];
            let type = types[0];
            if(binStr === CHECKV1) {
                //nothing
            } else if(binStr === CHECKV2) {
                version = parseInt(this.decodePixels(pixels, loc*3, 3).substring(0,8),2);
                loc += 1;
                type = types[parseInt(this.decodePixels(pixels, loc*3, 3).substring(0,8),2)];
                loc += 1;
            } else {
                this._logger.appendLine("Check at beginning of file failed. There is no information encoded.");
                this._logger.appendLine("Got check bits: " + binStr);
                vscode.window.showInformationMessage("There is no information encoded in this image (check key failed).");
                return;
            }
            this._logger.appendLine("Found encoded information! Decoding...");
        
            let result = [];
            while(true) {
                let binStr = this.decodePixels(pixels, loc*3, 3);
                let binInt = binStr.substring(0,8);
                result.push(parseInt(binInt,2));
                if(binStr.charAt(8)==='1') {
                    break;
                }
                loc += 1;
            }
        
            let decoded = new TextDecoder().decode(new Uint8Array(result));
            func({data: decoded, version: version, type:type});
        });
    };
}

export class PDFDecoder {
    constructor(
        private readonly _logger:vscode.OutputChannel
    ) {}

    public decodePDF(path:string, func:Function) {
        const content = fs.readFileSync(path, 'utf8');
        const matches = [...content.matchAll(/\/STEGANOLOGGER\s*\((.*)\)/g)];
        if(matches.length>0) {
            let match = matches[0][1];
            match = match.replaceAll(/\\\d{3}/g, function(val:string) {
                return String.fromCharCode(parseInt(val.substring(1),8));
            });
            this._logger.appendLine(match);
            let decoded = null;
            try {
                decoded = JSON.parse(match);
                decoded = {data:decoded.data, type:decoded.datatype, version: decoded.version};
            } catch {
                vscode.window.showErrorMessage("Found encoded information, but could not decode it. Interpreting it as text");
                decoded = {data: match, datatype: 'text', version: 2};
            }
            func(decoded);
        } else {
            vscode.window.showInformationMessage("There is no information encoded in this PDF.");
            return;
        }
    }
}

export class SVGDecoder {
    private static readonly KEY = "STEGANOLOGGER ENCODED DATA";
    constructor(
        private readonly _logger:vscode.OutputChannel
    ) {}

    public decodeSVG(path:string, func:Function) {
        this._logger.appendLine("Decoding svg");
        const svg = fs.readFileSync(path, {encoding:'utf8'});
        const start = new RegExp("<!--\\s*"+SVGDecoder.KEY+"\\s*$");
        const end = new RegExp(SVGDecoder.KEY+"\\s*-->$");
        let reading = false;
        let lines = svg.split("\n");
        let json = "";
        this._logger.appendLine("test " + lines.length);
        for(let i = 0; i < lines.length; i++) {
            if(reading) {
                this._logger.appendLine(lines[i]);
                if(end.test(lines[i])) { break; }
                json += lines[i];
            }
            if(start.test(lines[i])) { reading = true; }
        }
        if(reading) {
            let result = null;
            try {
                const decoded = JSON.parse(json);
                result = {data:decoded.data, type:decoded.datatype, version:decoded.version};
            } catch {
                vscode.window.showErrorMessage("Found encoded information, but could not decode it. Interpreting it as text");
                result = {data: json, datatype: 'text', version: 2};
            }
            func(result);
        } else {
            vscode.window.showInformationMessage("There is no information encoded in this svg file.");
            return;
        }
    }
}