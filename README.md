# Shell commands plugin for Obsidian

This plugin lets you define shell/terminal commands. You can then run these predefined commands via Obsidian's command palette, or you can assign hotkeys for your commands.

**Note:** This plugin is still under development and will be improved some da... some ye... some decade!

**WARNING:** Be careful with system commands! Only use commands that you know and trust. If you are copy pasting commands from the internet or from files written by other people, you need to understand precisely what those commands do! Otherwise, you might lose your files, or screw up your system!

**This plugin doesn't come with any kind of warranty in case it does something bad to your files!** If you know programming, [check the source code in GitHub](https://github.com/Taitava/obsidian-shellcommands) ([mainly this file](https://github.com/Taitava/obsidian-shellcommands/blob/main/main.ts)) so you know how it executes commands. The source code is not long.

## Main issues

- Only tested on Windows at the moment. Might work on other platforms too.
    Linux: will be tested at some point.
    Mac: I don't have a Mac, so I can't test this for Mac. Help wanted! :)
- Android and iPhone/iPad: I guess this does not work on these devices, because it uses NodeJS's `child_process`, so I've flagged this plugin as desktop only. Please raise an issue in GitHub if you are interested in support for Android/iOS.
- You need to define your vault's directory manually in the settings. I'll try to find a way to retrieve the path automatically.
- Add support for some variables (like current file path, current vault path). Currently, only static commands are supported.
- Detect and display errors the executed command might yield. Currently, the result of a command is just ignored.

## Would be nice to have features (these are not so important):
- Add configurable environment variables, that will be passed to the executed processes. This way you could for example indicate tell your own made script/program that you initiated it from Obsidian, in case it happens to have practical benefit.
- A configurable timeout (milliseconds). If the command execution takes longer than the timeout, a kill signal would be sent (`SIGTERM`). Timeout could be defined in the settings, and it would be turned off by default. Currently, there is no timeout.

## Installation & usage

1. Search for this plugin in Obsidian's community plugins settings panel.
2. Click Install, and after that **remember to click Enable**!
3. Head to *Shell commands* settings tab.
4. Input your vault's absolute path into the *Working directory* field. This can be for example *C:\users\YourUser\Desktop\ObsidianVaults\YourAwesomeVault\\* if you are on Windows. All commands will be run in this directory.
5. Define one or more commands by clicking the *New command* button, entering a command and clicking *Apply changes*.
6. All commands that you have defined, will be added to Obsidian's command palette. You can execute them from there (by hitting `Ctrl/Cmd + P` and searching for your command) or you can define a hotkey for each individual command in Obsidian's Hotkeys settings tab.

## Contributing
Ideas, issues, feedback, pull requests etc. are all welcome! :)

If you have a Mac, I'd be very glad if you could [test this plugin on your Mac and report here](https://github.com/Taitava/obsidian-shellcommands/issues/1).

## Author

Jarkko Linnanvirta

Contact:
 - https://github.com/Taitava
 - https://forum.obsidian.md/u/jare/