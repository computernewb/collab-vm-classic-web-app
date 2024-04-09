![[collab-vm-web-app] - Node.js Gulp](https://github.com/yellows111/collab-vm-web-app/workflows/%5Bcollab-vm-web-app%5D%20-%20Node.js%20Gulp/badge.svg)

# collab-vm-web-app
The Collab VM Web App powers the website-portion of Collab VM and the Virus Farm.

# What it contains
* The scripts that power CollabVM.

# Compilation requirements
To compile this, you need a *nix or a Windows-like environment. This has only been compiled on x64 (amd64), but it should work on other architectures (like x86 or arm). You need a system that supports node.js and npm. node.js and npm run on Windows, Mac OS X, virtually any Linux distribution, FreeBSD, OpenBSD, Android, NetBSD, OpenSUSE, SmartOS, WebOS, NonStop OS, and other operating systems. (However, compilation has only been tested on x64 Windows 7 and x64 Ubuntu 14.04 and 16.04). 

That's basically all the requirements needed.

# Compilation instructions

To build the web app, follow these steps.

* Step 1: Install node.js and npm. Windows and Mac OS X installers can be found here: https://nodejs.org/en/download/. For Linux, BSD, and other operating systems, visit this page: https://nodejs.org/en/download/package-manager/.
* Step 2: Make sure npm is updated fully by typing npm install --global npm in the terminal.
* Step 3: Install gulp from npm. You can do this by doing: npm install --global gulp-cli
* Step 4: Open the web-app directory and type: npm install
* Step 5: (Optionally) change the settings in common.js or set some of the DEBUG settings to true in collab-vm.js
* Step 6: If you're testing this locally, you need to set DEBUG = true in collab-vm.js and do: gulp guacamole. (If you're not testing this locally, this isn't required.)
* Step 7: Type gulp (or you can compile them indivdiually by typing gulp js, gulp html, etc).

# License
Collab VM Web App, as well as Collab VM Admin Web App and Collab VM Server are licensed under the [Apache License](https://www.apache.org/licenses/LICENSE-2.0).
