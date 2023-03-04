# steganologger
A VSCode extension/python script duo to encode and decode data in plots.
NOTE: Somehow, this extension does not work on remote systems if you install from the Marketplace on the remote. Use the .vsix package from the release on GitHub to install the extension on remote systems manually.

## Usage
### Decoding
This is done by the VSCode extension (for the usage of the python script, see below).
Right click an png, pdf or svg file in the explorer window. At the bottom of the context menu, the option "Decode image" will appear. If this option is chosen, the decoded text (if any) will be shown in the `Steganologger` view in the VSCode panel.

### Encoding
This uses the python script [https://github.com/juupje/steganologger/blob/main/python/steganologger.py](https://github.com/juupje/steganologger/blob/main/python/steganologger.py). Download the script and put it somewhere in your python path. You can then include the script and use the `encode` function:

```python
from steganologger import encode
from matplotlib import pyplot as plt
import numpy as np

#create a config
config = {"a": 0.5, "b": 2, "c": 3, "label": "Parabola"}

#create some plot using the config
x = np.linspace(-10,10,100)
y = config["a"]*x**2+config["b"]*x+config["c"]
plt.figure(figsize=(5,4))
plt.plot(x,y,label=config["label"])
plt.xlabel("$x$")
plt.ylabel("$y$")
plt.legend()
plt.savefig("plot.png", dpi=250)

#save the config
encode("plot.png", data=config, datatype='json', overwrite=True)
```

The `data` argument of the `encode` function can be either a dictionary or a string. In case of the former, the `datatype` will automatically be set to `'json'`. Otherwise, if the datatype is not given, the program will try to check if the string can be interpreted as a json and the datatype to `'json'` or `'text'` accordingly. If you are encoding a YAML file, pass it as a string and add the `datatype='yaml'` argument.

The file in which the data should be encoded, can either be a PNG image, a PDF document or an SVG file. The data will be encoded as follows:
- PNG: The data will be transformed into a byte array in which each byte is encoded into the RGB channels of three pixels of the image (with the blue channel of the third pixel functioning as a 'stop'-bit).
- PDF: The data will be added as a custom metadata tag
- SVG: The data will be added as a XML-comment at the very end of the file.

For more details on the usage of the `encode` and `decode` functions, see the documentation of the source code.

### Using the python script from the commandline
You can also call the python file mentioned above from the commandline. For example, to see data saved in the image above, use
```bash
$ python3 steganologger.py --decode --file=plot.png
{"a": 0.5, "b": 2, "c": 3, "label": "Parabola"}
```

## In VSCode
The extension adds a new tab to the panel. After decoding the image created in the example above by right-clicking on the image in the file explorer and delecting `Decode image`:
![https://github.com/juupje/steganologger/blob/main/images/Screenshot.png](https://github.com/juupje/steganologger/blob/main/images/Screenshot.png) 
The extension will take care of determining which type of file should be decoded (png, pdf of svg) and what type of data is encoded (json, yaml or plain text)

### Comparing decoded information
Given that this tool's main use-case is the encoding of the configuration file(s) used to create a plot, a very useful feature of the extension is the compare mode. By clicking on the book-icon in the panel when the Steganologger view is active, the comparison mode is toggled. Use the two dropdown menus to select two decoded files and click on the `compare` button to view the differences between the information encoded in the two files.

Note: this feature only supports json data. That means, if you use yaml configuration files, you will not be able to use this feature. I might add yaml support in the future, if enough people ask for it :).

## Installation
### Python script
1. Download the python script from the releases here on github.
2. Put the script somewhere in your python path (e.g. the `lib` folder of your project which has been added to the python path or in the working directory of your project)

### VSCode extension
Search for 'Steganologger' in the VSCode Marketplace and install it. Note: DO NOT install the extension on remote systems using the 'install on ...' button in VSCode. Somehow, it will not work but get stuck on loading the extension. Instead, download the .vsix package from the release on GitHub (make sure it is the newest version) to your remote system, and from within VSCode, right-click it and click 'Install extension VSIX" to install the extension on remote systems manually.

## Known bugs/issues
- Extension does not work when installing from the VSCode Marketplace on remote systems. Fix: install manually (see above)
This extension is very much in its testing phase, so the probability of it being bug-free is low. If you find a bug or have a feature request, let me know: ![https://github.com/juupje/steganologger](https://github.com/juupje/steganologger)
