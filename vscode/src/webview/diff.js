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
	for(let j = 0; j < keys.length-1; j++) {
		obj = obj[keys[j]]; //even works for lists?!
	}
	obj[keys[keys.length-1]] = value;
}

function setAllValues(obj, keys, value) {
	if(keys !== null) {
		//first go to the required depth
		for(let j = 0; j < keys.length-1; j++) {
			obj = obj[keys[j]]; //even works for lists?!
		}
		//proceed
		if(typeof obj[keys[keys.length-1]] !== 'object') {
			obj[keys[keys.length-1]] = value;
		} else {
			setAllValues(obj[keys[keys.length-1]], null, value);
		}
	} else {
		if(Array.isArray(obj)) {
			for(let i = 0; i < obj.length; i++) {
				if(typeof obj[i] == 'object' && Object.keys(obj[i]).length>0) {
					setAllValues(obj[i],null,value);
				} else {
					obj[i] = value;
				}
			}
		} else if(typeof obj == 'object') {
			for(const key in obj) {
				if(typeof obj[key] == 'object' && Object.keys(obj[key]).length>0) {
					setAllValues(obj[key], null, value);
				} else {
					obj[key] = value;
				}
			}
		} else {
			console.log("Cannot set value of variable");
		}
	}
}

function addSpanLine(line, classname, indents=0) {
	return "  ".repeat(indents) + "<span class='" + classname + "'>"+syntaxHighlight(line.substring(indents*2))+"</span>\n";
}

function add_color(obj, reference) {
	const lines = JSON.stringify(obj,null,2).split("\n");
	const ref_lines = JSON.stringify(reference,null,2).split("\n");
	if(lines.length != ref_lines.length) {
		console.log("Something went wrong! Reference does not match!");
	}
	let result = "";
	let length = 0;
	let scanningFor = "";
	for(let i = 0; i < lines.length; i++) {
		const indents = lines[i].search(/\S|$/)/2;
		if(length > 0) {
			length -= 1;
			result += addSpanLine(lines[i], scanningFor, indents);
			continue;
		}
		if(lines[i].endsWith("{") || lines[i].endsWith("[")) {
			let success = true;
			length = 0;
			scanningFor = "";
			for(let j = i+1; j < ref_lines.length; j++) {
				length += 1;
				const indents2 = ref_lines[j].search(/\S|$/)/2;
				if(indents2 <= indents) { //out of the block
					if(ref_lines[j].match(/\]|\}/)) { length += 1; }
					break;
				}
				if(ref_lines[j].match(/[\[\]\{\}]/)) { continue; } // nothing interesting on this line
				const match = ref_lines[j].match(/created|deleted/);
				if(match == null) {
					success = false;
					break;
				} else {
					if(scanningFor.length > 0 && scanningFor !== match[0]) {
						success = false;
						break;
					} else {
						scanningFor = match[0];
					}
				}
			}
			if(!success) {
				length = 0;
			} else {
			 	i -= 1; //do this line again
			 	continue;
			}
		}
		if(lines[i] === ref_lines[i] || ref_lines[i].match(/nothing/)) { result += syntaxHighlight(lines[i]) + "\n"; continue; }
		
		
		const type = ref_lines[i].match(/changed|created|deleted/)[0];
		result += addSpanLine(lines[i], type, indents);
	}
	return result;
}

export function colorDifferences(a, b) {
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
        setAllValues(e,keys,diff[i][1]);
    }
    return [add_color(c,e), add_color(d,e)];
}