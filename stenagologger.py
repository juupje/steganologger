from PIL import Image
import json
import os,sys
import argparse
CHECKKEY = "01010110"

def _modify_pixels(pix, data):
 
    datalist = [f"{ord(x):08b}" for x in data]
    datalist = [CHECKKEY] + datalist
    lendata = len(datalist)
    imdata = iter(pix)
 
    for i in range(lendata):
 
        # Extracting 3 pixels at a time
        pix = list(imdata.__next__()[:3]+ imdata.__next__()[:3]+ imdata.__next__()[:3])
 
        # Pixel value should be odd for 1 and even for 0
        for j in range(8):
            if(int(datalist[i][j]) != pix[j]%2):
                pix[j] += -1 if pix[j] > 0 else 1
        # continue bit: 0 means keep reading; 1 means stop
        continue_bit = 1 if i == lendata-1 else 0
        if(pix[-1]%2 != continue_bit):
            pix[-1] += -1 if pix[-1]>0 else 1
       
        pix = tuple(pix)
        yield pix[0:3]
        yield pix[3:6]
        yield pix[6:9]

def _encode_img(newimg, data):
    w = newimg.size[0]
    (x, y) = (0, 0)
    count = 0
    for pixel in _modify_pixels(newimg.getdata(), data):
 
        # Putting modified pixels in the new image
        newimg.putpixel((x, y), pixel)
        count += 1
        if (x == w - 1):
            x = 0
            y += 1
        else:
            x += 1
    print(f"Encoded {(count//3)} bytes in {count} pixels ({count/(newimg.size[0]*newimg.size[1])*100:.2f}% of image)")

def encode(image_path:str, data:dict, overwrite:bool=False, to_file:str=None) -> bool:
    """
    Parameters
    ----------
    image_path: str,
        Path of the image in which to encode the data
    data: dict,
        The dictionary to encode
    overwrite: bool,
        If `True`, overwrite the original file with the encoded file. 
        f the original file did not have the .png extension, it is added automatically
    to_file: str,
        If `overwrite` is `True`, this parameter can be used to determine the file to which
        the encoded image is saved. If it is not given, the string `-encoded` will be appended to 
        the original image's name.
    """
    try:
        if(type(data) is dict):
            data = json.dumps(data, ensure_ascii=True)
        if(type(data) is not str):
            ValueError("Cannot encode this type of data")
        if(not os.path.isfile(image_path)):
            print("Given image file does not exist.", file=sys.stderr)
        img = Image.open(image_path)
        img_copy = img.copy()
        img.close()
        _encode_img(img_copy, data)

        if(overwrite):
            img_copy.save(os.path.splitext(image_path)[0], "PNG")
        else:
            if(to_file is not None):
                if(not to_file.lower().endswith(".png")):
                    to_file += ".png"
                img_copy.save(to_file, "PNG")
            else:
                img_copy.save(os.path.splitext(image_path)[0]+"-encoded.png", "PNG")
    except Exception as e:
        print("Something went wrong, could not encode image!", file=sys.stderr)
        print(e)

def _decode_pixels(pixels):
    # string of binary data
    assert len(pixels)==9
    binstr = ''.join(str(i%2) for i in pixels)
    return binstr

def decode(image_path):
    if(not os.path.isfile(image_path)):
        print("No such file")
        exit()
    image = Image.open(image_path, 'r')
 
    data = ''
    imgdata = iter(image.getdata())
    pixels = [value for value in imgdata.__next__()[:3] +
                                imgdata.__next__()[:3] +
                                imgdata.__next__()[:3]]
    binstr = _decode_pixels(pixels)
    assert binstr[:8] == CHECKKEY, "Check key does not match: no encoded data found. Got: " + binstr[:8]
    while (binstr[-1]=='0'):
        pixels = [value for value in imgdata.__next__()[:3] +
                                imgdata.__next__()[:3] +
                                imgdata.__next__()[:3]]
        binstr = _decode_pixels(pixels)
        data += chr(int(binstr[:8],2))
    return data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Stenagologger')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--encode", "-e", help="Run in encoding mode", action='store_true')
    group.add_argument("--decode", "-d", help="Run in decoding mode", action='store_true')

    parser.add_argument("--data", help="Data to encode in JSON format. Use @ to reference a file", type=str)
    parser.add_argument("--file", help="The file to decode/encode", type=str, required=True)
    parser.add_argument("--out-file", help="If encoding, store the result to this file", type=str)
    parser.add_argument("--pretty", help="If decoding, output in pretty json", action="store_true")

    args = vars(parser.parse_args())
    if(args["encode"]):
        if("out_file" not in args or not args["out_file"]):
            print("No output file given")
            exit()
        if("data" not in args or not args["data"]):
            print("No data given")
            exit()
        data = args["data"]
        try:
            if(data[0]=='@'):
                with open(data[1:], 'r') as f:
                    data = json.load(f)
            else:
                data = json.loads(data)
        except json.JSONDecodeError as e:
            print(e)
        encode(args["file"], data, overwrite=False, to_file=args["out_file"])
    elif(args["decode"]):
        pretty = args["pretty"]
        s = decode(args["file"])
        try:
            s = json.loads(s)
        except json.JSONDecodeError as e:
            print(e)
            print("Could not interpret decoded text as json")
        if("out_file" in args and args["out_file"]):
            with open(args["out_file"], 'w') as f:
                if(type(s) is dict):
                    json.dump(s,f, indent=2 if pretty else None)
                else:
                    f.write(s)
        else:
            if(type(s) is dict):
                print(json.dumps(s, indent=2 if pretty else None))
            else:
                print(s)
    else:
        print("Nothing to do")