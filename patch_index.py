import re

with open("index.html", "r") as f:
    content = f.read()

head_insert = """    <link rel="manifest" href="/manifest.webmanifest" />
    <link href="https://fonts.cdnfonts.com/css/apple-color-emoji" rel="stylesheet">
    <style>"""

content = content.replace("""    <link rel="manifest" href="/manifest.webmanifest" />\n    <style>""", head_insert)

css_insert = """      .ios-emoji {
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif !important;
      }
      :root {"""
content = content.replace("      :root {", css_insert)

with open("index.html", "w") as f:
    f.write(content)
