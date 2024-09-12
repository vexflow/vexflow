#!/usr/bin/python3
# USAGE: python3 svgftembed.py <svg_file> <font_name>

import base64, re, sys, subprocess

file_path = sys.argv[1]
font_path = "../../../vexflow-fonts/" + sys.argv[2] + "/" + sys.argv[2] + ".woff2"
embedded_text = ""

# Read the SVG file
with open(file_path, 'r', encoding='utf-8') as file:
	svg_content = file.read()
	file.close()
	
# Find all text elements
text_elements = re.findall(r'(<text[^>]*>)(.*?)(</text>)', svg_content, re.DOTALL)

# Extract the text from the text elements
for start_tag, original_text, end_tag in text_elements:
	embedded_text = embedded_text + original_text

# Create subset font
with subprocess.Popen(['pyftsubset', font_path, '--text="' + embedded_text + '"', '--flavor=woff2', '--output-file=temp' ], stdout=subprocess.PIPE) as proc:
    proc.wait()
    with open("temp", "rb") as temp_file:
        base64_font = base64.b64encode(temp_file.read())
        temp_file.close()
        
    # Create embedded style
    embedded_style = '<style>@font-face{font-family: "' + sys.argv[2];
    embedded_style = embedded_style + '";font-style: normal;font-weight: normal;src: url("data:font/' + sys.argv[2] + ';base64,';
    embedded_style = embedded_style + base64_font.decode('utf-8');
    embedded_style = embedded_style + '");}</style>'
        
    # Find the SVG element
    svg_element = re.findall(r'(<svg[^>]*>)(.*?)(<)', svg_content, re.DOTALL)

    # Embed the style in the SVG element
    svg_content = svg_content.replace(f'{svg_element[0][0]}{svg_element[0][1]}{svg_element[0][2]}', f'{svg_element[0][0]}{svg_element[0][1]}{embedded_style}{svg_element[0][2]}')

    # Write the SVG file
    file = open(file_path, "w")
    file.write(svg_content)
    file.close()

