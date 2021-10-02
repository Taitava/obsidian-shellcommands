<div style="margin-top: -40px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;⏫ Remember to enable! <!-- Meant for Obsidian community plugin list view. --></div>

# Shell commands plugin for Obsidian

This plugin lets you define shell/terminal commands in settings and run them quickly via Obsidian's command palette, or via hotkeys. Use note related variables as part of the commands, and insert output back to your notes, if you wish. This is a Swiss army knife when it comes to accessing external applications from Obsidian, and you are the one who defines its tools.

You can customise your commands with built-in variables that can provide the current file title/name/path, current file's parent folder name/path, and date/time stamp with a custom format.

[A changelog is available in a separate file.](https://github.com/Taitava/obsidian-shellcommands/blob/main/CHANGELOG.md)

**WARNING:** Be careful with system commands! Only use commands that you know and trust. If you are copy pasting commands from the internet or from files written by other people, you need to understand precisely what those commands do! Otherwise, you might lose your files, or screw up your system!

**The plugin is still in its early development stage.** And its developer is not yet very experienced in creating solid testing patterns to find out possible problems. Use at your own risk, and note that when you upgrade the plugin, things may break.

**This plugin doesn't come with any kind of warranty in case it does something bad to your files!** If you know programming, [check the source code in GitHub](https://github.com/Taitava/obsidian-shellcommands) so you know how it executes commands.

## Main issues
- [Variable values are not escaped, which may cause huge problems (#11)](https://github.com/Taitava/obsidian-shellcommands/issues/11)
- [Windows: Non-ascii characters in commands do not work correctly (#5)](https://github.com/Taitava/obsidian-shellcommands/issues/5)
- Android and iPhone/iPad: I guess this does not work on these devices, because it uses NodeJS's `child_process`, so I've flagged this plugin as desktop only. Please raise an issue in GitHub if you are interested in support for Android/iOS.

For other issues/ideas, see the [issue tracker](https://github.com/Taitava/obsidian-shellcommands/issues).

## Installation & usage

1. Search for this plugin in Obsidian's community plugins settings panel.
2. Click Install, and after that **remember to click Enable**!
3. Head to *Shell commands* settings tab.
4. All commands will be run in a certain directory. By default, it's your vault's base directory. If you want to run the commands in some other directory, you can type it in the *Working directory* field.
5. Define one or more commands by clicking the *New command* button and entering a command. Read variable usage instructions in the settings panel if you need them.
6. For advanced settings, such as a command alias name that appears in the command palette instead of the actual shell command, or an ability to direct command output to a currently active note, click a small gear icon next to the shell command.
7. All commands that you have defined, will be added to Obsidian's command palette. You can execute them from there (by hitting `Ctrl/Cmd + P` and searching for your command) or you can define a hotkey for each individual command in Obsidian's Hotkeys settings tab.

## Usage examples

These examples are written for Windows, but you can invent similar ones in Linux and Mac too.

| Purpose | Command | Hotkey |
| ------- | ------- | ------ |
| Open a graphical [Git](https://git-scm.com/) client for committing changes in your vault to a repository. | `start git-gui` | Ctrl + Shift + G |
| Open a Git command line client for advanced management of a repository. | `start "" "%PROGRAMFILES%\Git\bin\sh.exe" --login` | Ctrl + Alt + G | <!-- Command copied 2021-08-22 from https://stackoverflow.com/a/17306604/2754026  -->
| Commit the current file in a quick & dirty way to Git (not the best way in all cases). | `git add "{{file_path:relative}}" & git commit -m "Meeting notes {{date:YYYY-MM-DD}}" & git push` | Ctrl + Alt + Shift + G |
| A quick way to run other commands that you have not defined in the settings. | `start cmd` | Ctrl + Shift + C |
| In case you feel creative... | `mspaint` | Ctrl + Shift + P |
| The quickest way to write bug reports regarding this plugin. | `start https://github.com/Taitava/obsidian-shellcommands/issues/new` | Ctrl + Shift + B |
| Create a monthly folder like 2021-08. | `mkdir {{date:YYYY-MM}}` | Ctrl + Shift + M |
| Create a new file and paste content there from clipboard. | `echo {{clipboard}} >> NewNote.md` | Ctrl + Shift + N |
| Search the web using text you have selected. | `start https://duckduckgo.com/?q={{selection}}` | Ctrl + Shift + S |
| Obsidian URI: Open another vault * | `start "" "obsidian://open?vault=my%20vault"` | Ctrl + Shift + A |
| [Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri): Open a workspace * | `start "" "obsidian://advanced-uri?vault=my%20vault&workspace=main"` | Ctrl + Shift + W |
| Insert a link with file title and workspace name to clipboard. You can have workspaces named by e.g. book names that you read. * | `echo "[[{{title}}\|{{title}} -> {{workspace}}]]" \| clip` (unfortunately echo adds a line break after the text) | Ctrl + L |
| *) Thank you [FelipeRearden](https://github.com/FelipeRearden) for these ideas! 🙂 | | |

These are just examples, and this plugin **does not** define them for you automatically. They are listed only to give you ideas of what kind of commands you could configure yourself, and what kind of hotkeys you could assign to them. The mentioned hotkeys are not reserved for other uses in Obsidian (v. 0.12.12) at the time of writing these examples.

Note that for the sake of simplicity, there is no escaping done for variable values. If you have a command and a quoted string parameter like `mycommand "{{clipboard}}"`, it might break if your clipboard content contains `"` quote characters, because those are inserted into the command as-is. Your command might end up looking like this: `mycommand "Text pasted from clipboard that contains a " character."` I am open to discussion how to best implement variable value escaping in the future.

## Benefits from other plugins
Not a single plugin can be great just by itself. And not a single plugin suits every situation. Here I'm collecting a list of plugins that can be good companions or good alternatives to *Shell commands*.

<!-- Keep in alphabetical order! -->
- **[Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri)**: You can use this to open other vaults, switch workspaces without using a graphical user interface, and append content to notes, etc. Example command to insert clipboard content into a note with a shell command: `start "" obsidian://advanced-uri?vault=Vault_name&filepath=Filename.md&data={{clipboard}}&mode=append` (on Windows). Another way, without *Advanced URI*, is to use something like `echo {{clipboard}} >> Filename.md` (on Windows).
- **[cMenu](https://github.com/chetachiezikeuzor/cMenu-Plugin)**: When you select text, this plugin opens a small modal of buttons for text formatting and other actions. You can add shell commands to the mix!
- **[Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar)**: Allows you to add new left side menu icons that fire what ever Obsidian command you want - including shell commands!
- **[QuickAdd](https://github.com/chhoumann/quickadd)**: You can create macros that launch multiple commands at once. Sure, in *Shell commands*, you can have multiple terminal commands executed one after another (with `&&` operator for Linux and Mac, and `&` operator for Windows), but *QuickAdd* allows you to have macros that combine shell commands to other Obsidian commands.
- **[Text Expander](https://github.com/konodyuk/obsidian-text-expander)**: If you want to write codeblocks in your markdown note files and execute them, then *Text Expander* is the solution for you. *Shell commands* focuses on bringing short, rarely changed terminal commands at your finger tips via hotkeys. You can run longer scripts with *Shell commands* too by writing them into a bash/batch file and executing that file as a command, but if you need to view the script before executing it, or make changes regularly, then *Shell commands* is not so optimal for your situation, and you might benefit more from *Text Expander*. But of course, you can also have both if you like.

(Thanks [FelipeRearden](https://github.com/FelipeRearden) for telling me about many of these plugins!)

## Tested platforms

Here is a list of operating systems this plugin has been tested on, along with Obsidian version and the plugin's version (= SC, Shell commands).

| Shell commands version | Windows 10 | Linux (Xubuntu 20.04) | Mac |
| -----------------------| ---------- | --------------------- | --- |
| SC 0.4.1 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.4.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.3.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.2.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.1.1 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.1.0 | Obsidian 0.12.12<br>Works | Obsidian 0.12.12<br>Works | macOS: 11.5.2<br>Obsidian: 0.12.5<br>Works, tested by [skipadu](https://github.com/skipadu), thank you! 🙂 |
| SC 0.0.0 | Obsidian 0.12.12<br>Works | Obsidian 0.12.12<br>Works | |

As I do not own a Mac, tests on Mac are performed by other people, and I cannot quarantee that every version will be tested on Mac. That's the reason why Mac might not appear on every row in the above table. If you notice that a newest SC version does not have a Mac test record in the table, you can help by [performing a Mac test yourself and submitting your freeform test result here](https://github.com/Taitava/obsidian-shellcommands/issues/1).

## Ask for help

If you have any questions about how to use this plugin, please feel free to [open an issue in GitHub](https://github.com/Taitava/obsidian-shellcommands/issues), or [post in the plugin's Obsidian.md forum topic](https://forum.obsidian.md/t/shell-commands-plugin/23497).

## Contributing
Ideas, issues, feedback, pull requests etc. are all welcome! :)

## Author

Jarkko Linnanvirta

Contact:
 - https://github.com/Taitava
 - https://forum.obsidian.md/u/jare/
