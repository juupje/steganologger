import { syntaxHighlight } from "./highlight";

function getDifference(a, b) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].reduce((r, k) => {
        if (a[k] && b[k] && typeof a[k] === 'object' && typeof b[k] === 'object') {
            var temp = getDifference(a[k], b[k]);
            if (temp.length) r.push(...temp.map(([l, ...a]) => [k + '^' + l, ...a]));
            return r;
        }

        if (k in a && !(k in b)) {
            r.push([k, 'deleted', a[k]]);
            return r;
        }

        if (!(k in a) && k in b) {
            r.push([k, 'created', b[k]]);
            return r;
        }

        if (a[k] === b[k]) return r;

        r.push([k, 'changed', a[k], b[k]]);
        return r;
    }, []);
}

function addKey(obj, keys, value) {
	for(let j = 0; j < keys.length-1; j++)
		obj = obj[keys[j]]; //even works for lists?!
	obj[keys[keys.length-1]] = value;
}

function setAllValues(obj, keys, value) {
	if(keys !== null) {
		//first go to the required depth
		for(let j = 0; j < keys.length-1; j++)
			obj = obj[keys[j]]; //even works for lists?!
		//proceed
		if(typeof obj[keys[keys.length-1]] !== 'object')
			obj[keys[keys.length-1]] = value;
		else
			setAllValues(obj[keys[keys.length-1]], null, value);
	} else {
		if(Array.isArray(obj)) {
			for(let i = 0; i < obj.length; i++) {
				if(typeof obj[i] == 'object' && obj[i] != null && Object.keys(obj[i]).length>0)
					setAllValues(obj[i],null,value);
				else
					obj[i] = value;
			}
		} else if(typeof obj == 'object') {
			for(const key in obj) {
				if(typeof obj[key] == 'object' && obj[key] != null && obj[key] != undefined && Object.keys(obj[key]).length>0)
					setAllValues(obj[key], null, value);
				else
					obj[key] = value;
			}
		} else
			console.log("Cannot set value of variable");
	}
}

function addSpanLine(line, classname, indents=0) {
	return "  ".repeat(indents) + "<span class='" + classname + "'>"+syntaxHighlight(line.substring(indents*2))+"</span>\n";
}

function add_empty_lines(a_lines, b_lines, ref_lines) {
	const a_indents = a_lines.map(line => line.search(/\S|$/)/2);
	const b_indents = b_lines.map(line => line.search(/\S|$/)/2);
	for(let i = 0; i < a_lines.length; i++) {
		if(a_indents[i]==b_indents[i]) continue;
		if(a_indents[i]>b_indents[i]) {
			const indents = a_indents[i-1];
			const idx = i;
			for(; i < a_indents.length && a_indents[i]>indents; i++) {}
			const count = i-idx+1;//(a_lines[idx-1].includes(':') ? 1 : 0); //+1 for the line with the closing bracket
			b_indents.splice(idx,0,...Array(count).fill(0));
			b_lines.splice(idx,0,...Array(count).fill(""));
			ref_lines.splice(idx,0,...Array(count).fill(""));
		} else {
			const indents = b_indents[i-1];
			const idx = i;
			for(; i < b_indents.length && b_indents[i]>indents; i++) {}
			const count = i-idx+1;//(b_lines[idx-1].includes(':') ? 1 : 0);
			a_indents.splice(idx,0,...Array(count).fill(0));
			a_lines.splice(idx,0,...Array(count).fill(""));
			ref_lines.splice(idx,0,...Array(count).fill(""));
		}
	}
	const ref_indents = ref_lines.map(line => line.search(/\S|$/)/2);
	return [a_indents, b_indents, ref_indents];
}

function add_color(lines, ref_lines, line_indents, ref_indents, vscode) {
	if(lines.length != ref_lines.length) {
		//vscode.postMessage({command: "error", message: "Unable to calculate differences (do one or more datatypes not match?)"})
		console.log("Something went wrong! Reference does not match! " + lines.length + " vs. " + ref_lines.length);
		return null;
	}
	let result = "";
	let length = 0;
	let scanningFor = "";
	let lastTag = "";
	for(let i = 0; i < lines.length; i++) {
		const indents = line_indents[i];
		if(length > 0) {
			length -= 1;
			result += addSpanLine(lines[i], scanningFor, indents);
			continue;
		}
		if(lines[i].length==0) {
			result += "\n";
			continue;
		}
		if(ref_lines[i].length == 0) {
			result += addSpanLine(lines[i], lastTag, indents);
			continue;
		}
		if((lines[i].endsWith("{") || lines[i].endsWith("[")) && !ref_lines[i].includes("changed")) {
			//Check if all entries in this block are of the same type (created/deleted)
			let success = true;
			length = 0;
			scanningFor = "";
			for(let j = i+1; j < ref_lines.length; j++) {
				length += 1;
				if(ref_lines[j].length==0) continue;
				const indents2 = ref_indents[j];
				if(indents2 <= indents) { //out of the block
					if(ref_lines[j].match(/\]|\}/)) { length += 1; }
					break;
				}
				if(ref_lines[j].match(/[\[\]\{\}]/)) continue; // nothing interesting on this line
				const match = ref_lines[j].match(/created|deleted/);
				if(match == null) {
					success = false;
					break;
				} else {
					if(scanningFor.length > 0 && scanningFor !== match[0]) {
						success = false;
						break;
					} else
						scanningFor = match[0];
				}
			}
			if(!success)
				length = 0;
			else {
			 	i -= 1; //do this line again
			 	continue;
			}
		}
		if(lines[i] === ref_lines[i] || ref_lines[i].match(/nothing/)) { 
			result += syntaxHighlight(lines[i]) + "\n";
			lastTag = "";
			continue;
		}
		
		const type = ref_lines[i].match(/changed|created|deleted/);
		if(type != null && type.length==1) {
			lastTag = type[0];
			result += addSpanLine(lines[i], type[0], indents);
		} else {
			console.log("Could not parse line! " + ref_lines[i]);
			result += ref_lines[i] + "\n";
		}

	}
	return result;
}

function isDict(v) {
    return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date);
}

export function colorDifferences(a, b, vscode) {
    const diff = getDifference(a,b);
    const str = JSON.stringify(a);
    let c = JSON.parse(str);
    let d = JSON.parse(str); //copy a to get the same order
    let e = JSON.parse(str); //This will keep track of changes (deep)!
    setAllValues(e,null,"nothing");
    for(let i = 0; i < diff.length; i++) {
        const keys = diff[i][0].split("^");
        switch(diff[i][1]) {
            case 'created':
                // was in b, not in a => add the element to c and d (and also to e)
                addKey(c, keys, diff[i][2]);
                addKey(e, keys, JSON.parse(JSON.stringify(diff[i][2])));
            case 'deleted':
                // was in a, not in b => add the element to d
                addKey(d, keys, diff[i][2]); //also if created is true
                break;
            case 'changed':
                addKey(d, keys, diff[i][3]);
                break;
        }
		if(diff[i][1] == 'changed') {
			if((Array.isArray(diff[i][2]) && Array.isArray(diff[i][3])) 
					|| (isDict(diff[i][2]) && isDict(diff[i][3])))
				setAllValues(e,keys,diff[i][1]);
			else
				addKey(e,keys,diff[i][1]);
		} else
        	setAllValues(e,keys,diff[i][1]);
    }
	const left_lines = JSON.stringify(c,null,2).split("\n");
	const right_lines = JSON.stringify(d,null,2).split("\n");
	const ref_lines = JSON.stringify(e,null,2).split("\n");

	const indents = add_empty_lines(left_lines, right_lines,ref_lines);
	const left = add_color(left_lines,ref_lines, indents[0], indents[2], vscode);
	const right = add_color(right_lines, ref_lines, indents[1], indents[2], vscode);
    return (left && right ? [left, right, ref_lines.join("\n")] : null);
}