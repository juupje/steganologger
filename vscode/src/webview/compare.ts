import { provideVSCodeDesignSystem, vsCodeDropdown, vsCodeOption, vsCodeButton } from "@vscode/webview-ui-toolkit";
import { colorDifferences } from "./diff";

provideVSCodeDesignSystem().register(vsCodeDropdown(), vsCodeOption(), vsCodeButton());

(function() {
  const vscode = acquireVsCodeApi();
  const oldState = vscode.getState() || {tabs: [] as any, current: null, left: 0, right:1} as any;

  let tabs = oldState.tabs; // this is not changed here
  let current = oldState.current; // this is not changed here
  let left = oldState.left || 0;
  let right = oldState.right || 1;

  if(tabs.length<2) {
    (document.getElementById("file_left") as HTMLTableCellElement).innerHTML = "Not enough files to compare.";
    return;
  }
  if(left > tabs.length) {
    left = tabs.length-1;
  }
  if(right > tabs.length) {
    right = tabs.length-2;
  }

  (document.getElementById("comparebtn") as HTMLButtonElement).onclick = compare;

  let dd1 = document.getElementById("dropdown_left") as HTMLSelectElement;
  let dd2 = document.getElementById("dropdown_right") as HTMLSelectElement;
  for(let i = 0; i < tabs.length; i++) {
    let option = document.createElement("vscode-option") as HTMLInputElement;
    let name = tabs[i].name;
    option.value = "" + i;
    option.innerHTML = name.substring(name.lastIndexOf("/")+1);
    option.title = name;
    let option2 = option.cloneNode(true) as HTMLInputElement;
    dd1?.appendChild(option);
    dd2?.appendChild(option2);
  }
  setTimeout(() => {
    dd1.selectedIndex = left;
    dd2.selectedIndex = right;
    doCompare(left,right);
  },100);

  function updateState() {
    vscode.setState({tabs:tabs, current: current, left:left, right:right});
  }
  
  function compare() {
    left = getSelection("left");
    right = getSelection("right");
    doCompare(left,right);
  }

  function doCompare(left:number,right:number) {
    let jl = tabs[left].json;
    let jr = tabs[right].json;
    
    console.log(left + " - " + right);
    try {
        if(typeof jl !== 'object') { jl = JSON.parse(jl as string); }
        if(typeof jr !== 'object') { jr = JSON.parse(jr as string); }
    } catch {
        vscode.postMessage({command: "error", message: "Could not decode JSON"});
        return;
    }
    let lefttitle = document.getElementById("file_left") as HTMLElement;
    let righttitle = document.getElementById("file_right") as HTMLElement;
    lefttitle.innerHTML = "<pre class='json'>" + tabs[left].name + "</pre>";
    righttitle.innerHTML = "<pre class='json'>" + tabs[right].name + "</pre>";

    let leftjson = document.getElementById("json_left") as HTMLElement;
    let rightjson = document.getElementById("json_right") as HTMLElement;

    const differences = colorDifferences(jl, jr);

    leftjson.innerHTML = "<pre class='json'>" + differences[0] + "</pre>";
    rightjson.innerHTML = "<pre class='json'>" + differences[1] + "</pre>";

    updateState();
  }

  function nameToIndex(name:string):number {
    for(let idx = 0; idx < tabs.length; idx++) {
        if(tabs[idx].name === name) {
            return idx;
        }
    }
    return -1;
  }
  
  function getSelection(name:string):number {
      let selected = (document.getElementById("dropdown_"+name) as HTMLSelectElement).querySelector(".selected") as HTMLElement;
      return nameToIndex(selected.title);
  } 
}());