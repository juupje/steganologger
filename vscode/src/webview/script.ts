import { syntaxHighlight, jsonToString } from "./highlight";
(function() {
  const vscode = acquireVsCodeApi();
  const oldState = vscode.getState() || {tabs: [] as any, current: null, left:0, right:1} as any;
  
  var counter = 0;
  var tabs = oldState.tabs;
  var current = oldState.current;
  var left = oldState.left; //these are not changed here
  var right = oldState.right; //these are not changed here

  for(var i = 0; i < tabs.length; i++) {
    tabs[i].number = addJSON(tabs[i].json, tabs[i].name);
  }
  updateState(); //to update the tab numbers

  window.addEventListener('message', event => {
    const message = event.data;
    switch(message.type) {
      case 'addJSON': {
        let idx = checkIfAlreadyAdded(message.name);
        if(idx >= 0) {
          //Already in the list
          current = tabs[idx].number;
          let element = document.getElementById("tab"+current) as HTMLInputElement;
          element.checked = true;
          let div = document.getElementById("tabcontent"+tabs[idx].number) as HTMLDivElement;
          div.innerHTML = "<pre class='json'>File: "+ message.name + "<br/>" + syntaxHighlight(jsonToString(message.json)) + "</pre>";
          tabs[idx].json = message.json
          updateState();
        } else {
          let num = addJSON(message.json, message.name);
          current = num;
          tabs.push({json: message.json, name:message.name, number:num});
          updateState();
        }
        break;
      }
      case 'clear': {
        tabs = [];
        current = null;
        updateState();
        counter = 0;
        let container = document.getElementById("tabcontainer") as HTMLDivElement;
        container.innerHTML = "<pre id='json'>Nothing here yet.</pre>";
        break;
      }
      case 'removeTab': {
        let idx = getCurrentTabIndex();
        if(idx == -1) {
          console.log("Couldn't determine selected tab");
          break;
        }
        tabs = (idx == 0 ? tabs.slice(1) : 
                (idx == tabs.length-1 ? tabs.slice(0,-1) : tabs.slice(0,idx).concat(tabs.slice(idx+1))));

        //Remove the input, label and content
        document.getElementById("tab"+current)?.remove()
        document.getElementById("label"+current)?.remove();
        document.getElementById("tabcontent"+current)?.remove();
        if(tabs.length==0) {
          let container = document.getElementById("tabcontainer") as HTMLDivElement;
          container.innerHTML = "<pre id='json'>Nothing here yet.</pre>";
          current = null;
        } else {
          let inputs = document.getElementsByClassName("tabinput");
          let input = inputs[0] as HTMLInputElement;
          for(let i = 1; i < inputs.length; i++) {
            input = inputs[i] as HTMLInputElement;
          }
          if(Math.abs(Number(input.value)-current)===1) {
            current = input.value;
            input.checked = true;
          }
        }
        updateState();
        break;
      }
      case 'refreshTab': {
        let idx = getCurrentTabIndex();
        if(idx == -1) {
          console.log("Couldn't determine selected tab");
          break;
        }
        vscode.postMessage({command: "refreshTab", file: tabs[idx].name});
        break;
      }
      case 'refreshAll': {
        let oldtabs = tabs;
        tabs = [];
        current = null;
        updateState();
        counter = 0;
        clearPanel();
        for(let i = 0; i < oldtabs.length; i++) {
          vscode.postMessage({command: "refreshTab", file: oldtabs[i].name});
        }
        break;
      }
    }
  });

  function addJSON(json:string|{[key:string]:any}, name:string):number {
    counter += 1;
    if(counter==1) {
      clearPanel();
    }
    let str = syntaxHighlight(jsonToString(json));
    let input = document.createElement("input");
    input.type = "radio";
    input.className = "tabinput";
    input.name = "tabs";
    input.id = "tab" + counter;
    input.value = ""+counter;
    if(counter === current) {
      input.checked = true;
    }
    input.onclick = onTabClick;
    let label = document.createElement("label");
    label.id = "label" + counter;
    label.htmlFor = "tab"+counter;
    label.innerHTML = name.substring(name.lastIndexOf("/")+1);
    let div = document.createElement("div") as HTMLDivElement;
    div.id = "tabcontent" + counter;
    div.classList.add("tab", "tabcontent");
    div.innerHTML = "<pre class='json'>File: "+ name + "<br/>" + str + "</pre>";
    let tabs = document.getElementById("tabcontainer");
    tabs?.appendChild(input);
    tabs?.appendChild(label);
    tabs?.appendChild(div);
    console.log("Added tab" + counter);
    return counter
  }

  //Returns the index of the tabs array corresponding to this name, or -1 if it does not exist
  function checkIfAlreadyAdded(name:string):number {
    for(let i = 0; i < tabs.length; i++) {
      if(tabs[i].name===name){
        return i;
      }
    }
    return -1;
  }

  function tabNumberToIndex(tabNumber:number):number {
    let idx = 0;
    for(; idx < tabs.length; idx++) {
      if(tabs[idx].number === tabNumber) { return idx; }
    }
    return -1;
  }

  function getCurrentTabIndex():number {
    return tabNumberToIndex(current);
  }

  function onTabClick() {
    let element = document.querySelector('input[name="tabs"]:checked') as HTMLInputElement;
    current = Number(element.value);
    updateState();
  }

  function updateState() {
    vscode.setState({tabs:tabs, current: current, left:left, right:right});
  }

  function clearPanel() {
    let tabs = document.getElementById("tabcontainer") as HTMLDivElement;
    tabs.innerHTML = "";
  }
}());