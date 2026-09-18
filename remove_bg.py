import sys
from PIL import Image

def remove_background(input_path, output_path, tolerance=50):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    # Get the color of the top-left pixel to use as the background color
    # Since it's a checkerboard, we might need to remove both colors.
    # The checkerboard seems to consist of white-ish and gray-ish squares.
    
    # Instead of flood fill, let's just make all pixels that are grayscale and light transparent.
    # The cassette is mostly dark, but the label has some white and red.
    # Actually, a simple threshold on lightness for the background might remove the white label on the tape.
    
    # A better approach for a fake-checkerboard background:
    # The checkerboard is usually #FFFFFF and #CCCCCC (or close to it due to JPEG).
    new_data = []
    for item in data:
        r, g, b, a = item
        
        # Check if pixel is gray-ish (R,G,B are very close to each other)
        is_gray = abs(r - g) < 15 and abs(g - b) < 15 and abs(r - b) < 15
        
        # Check if it's light enough to be part of the checkerboard
        is_light = r > 180 and g > 180 and b > 180
        
        if is_gray and is_light:
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python remove_bg.py <input> <output>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    remove_background(input_file, output_file)
    print(f"Processed {input_file} -> {output_file}")
