import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

bad_part = """                      )
                    )}
                  </div>"""

fixed_part = """                      )
                    )}
                  </div>"""

content = content.replace(bad_part, fixed_part) # wait, I just wrote the exact same thing
