import PyInstaller.__main__
import os

# Ensure we are in the script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("Building ICT Inventory Agent...")

PyInstaller.__main__.run([
    'agent.py',
    '--onefile',
    '--name=agent',
    '--icon=NONE', # You can add an .ico path here if you have one
    '--clean',
    '--noconsole', # Run without console window
    '--add-data=config.json;.' # Include default config (though we usually want it external)
])

print("Build complete. Executable is in 'dist/agent.exe'")
