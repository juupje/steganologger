import * as vscode from 'vscode';

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

    public decodePNG(pixels:number[]) {
        const CHECK = "01010110" + "0";
        //const CHECK = "0101101110" + "01";
        let binStr = this.decodePixels(pixels, 0,3);
        if(binStr !== CHECK) {
            this._logger.appendLine("Check at beginning of file failed. There is no information encoded.");
            this._logger.appendLine("Got check bits: " + binStr);
            vscode.window.showInformationMessage("There is no information encoded in this image (check key failed).");
            return "";
        }
        this._logger.appendLine("Found encoded information! Decoding...");
    
        let result = [];
        let loc = 1;
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
        return decoded;
    };
}
