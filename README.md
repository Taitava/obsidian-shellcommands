<div style="margin-top: -40px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;⏫ Remember to enable! <!-- Meant for Obsidian community plugin list view. --></div>

# Shell commands plugin for Obsidian

This plugin lets you define shell/terminal commands in settings and run them quickly via Obsidian's command palette, or via hotkeys. Use note related variables as part of the commands, and insert output back to your notes, if you wish. This is a Swiss army knife when it comes to accessing external applications from Obsidian, and you are the one who defines its tools.

You can customise your commands with built-in variables that can provide the current file title/name/path, current file's parent folder name/path, and date/time stamp with a custom format.

[A changelog is available in a separate file.](https://github.com/Taitava/obsidian-shellcommands/blob/main/CHANGELOG.md)

**WARNING:** Be careful with system commands! Only use commands that you know and trust. If you are copying and pasting commands from the internet or from files written by other people, you need to understand precisely what those commands do! Otherwise, you might lose your files, or screw up your system!

**The plugin is still in its early development stage.** And its developer is not yet very experienced in creating solid testing patterns to find out possible problems. Use at your own risk, and note that when you upgrade the plugin, things may break.

**This plugin doesn't come with any kind of warranty in case it does something bad to your files!** If you know programming, [check the source code in GitHub](https://github.com/Taitava/obsidian-shellcommands) so you know how it executes commands.

## Main issues
- **Windows & PowerShell: Non-English characters can be corrupted in output**. Input _might_ work ok. Read more: #157. Linux and Mac users should not have this issue.
- Special characters in `{{variable}}` values are escaped (except if CMD.EXE is used as a shell), but it's **still experimental**. Potential escaping problems can be dangerous. [Documentation about how special characters are escaped in variable values](https://publish.obsidian.md/shellcommands/Variables/Escaping+special+characters+in+variable+values). Edit 2022-03-11: Now that the escaping system has been in use for a few months, it seems that it works quite nicely. However, more experience is still welcome. Edit 2022-06-10: Changed the link to point to documentation that contains newer information than [issue #11](https://github.com/Taitava/obsidian-shellcommands/issues/11).
- **No mobile support**, because the plugin uses NodeJS's `child_process`, so I've flagged this plugin as desktop only. I do not have any plans at the moment to research an ability to make this work on mobile. If you have some clues, please start a discussion in GitHub.
- [If you have installed Obsidian using Flatpak, shell commands are executed in an isolated environment, which may cause unexpected behaviour or error messages.](https://github.com/Taitava/obsidian-shellcommands/discussions/225)

For future ideas, see the [Discussions section](https://github.com/Taitava/obsidian-shellcommands/discussions).

## Installation & usage

1. Search for this plugin in Obsidian's community plugins settings panel.
2. Click Install, and after that **remember to click Enable**!
3. Head to *Shell commands* settings tab.
4. All commands will be run in a certain directory. By default, it's your vault's base directory. If you want to run the commands in some other directory, you can type it in the *Working directory* field.
5. Define one or more commands by clicking the *New command* button and entering a command. Read variable usage instructions in the settings panel if you need them.
6. For advanced settings, such as a command alias name that appears in the command palette instead of the actual shell command, or an ability to direct command output to a currently active note, click a small gear icon next to the shell command.
7. All commands that you have defined, will be added to Obsidian's command palette. You can execute them from there (by hitting `Ctrl/Cmd + P` and searching for your command) or you can define a hotkey for each individual command in Obsidian's Hotkeys settings tab.

## Extensive documentation
... is available right here: https://publish.obsidian.md/shellcommands

## Usage examples

Example shell commands have been moved to: https://publish.obsidian.md/shellcommands/Example+shell+commands/Example+shell+commands

## Escaping special characters in variable values
(Todo: check that the Documentation has all this content, and then remove this section from README.md.)

Note that special characters (= anything else than letters, numbers and underscores `_`) are automatically escaped in variable values. Escaping depends on the shell that you use, but generally speaking, each special character is prefixed with an escape character, which might be `\`, \` or `%` depending on shell.  

**Without escaping**, if you would have a command and a quoted string parameter like `mycommand {{clipboard}}`, it might break if your clipboard content contains `>` characters, because those would be inserted into the command as-is. Your command might end up looking like this: `mycommand Text pasted from clipboard that contains a > character.` The `>` character would redirect output to a file and might overwrite an important file. That's why escaping is in place, making the aforementioned command look like this: `mycommand\ Text\ pasted\ from\ clipboard\ that\ contains\ a\ \>\ character\.` (when the shell is Bash). Your shell then parses the escaped special characters and uses them as literal letters, not as special characters.

If you want to avoid escaping special characters in variable values, you can use `{{!variable}}` syntax, meaning that you can add an exclamation mark `!` in the front of a variable's name. Note that this can be dangerous, and you need to understand very well what you are doing if you use this kind of raw, unescaped variable values! In most situations, you should be able to use escaped variables really well.

## Benefits from other plugins
Not a single plugin can be great just by itself. And not a single plugin suits every situation. Here I'm collecting a list of plugins that can be good companions or good alternatives to *Shell commands*.

<!-- Keep in alphabetical order! -->
- **[Advanced URI](https://github.com/Vinzent03/obsidian-advanced-uri)**: You can use this to open other vaults, switch workspaces without using a graphical user interface, and append content to notes, etc. Example command to insert clipboard content into a note with a shell command: `start "" obsidian://advanced-uri?vault=Vault_name&filepath=Filename.md&data={{clipboard}}&mode=append` (on Windows). Another way, without *Advanced URI*, is to use something like `echo {{clipboard}} >> Filename.md` (on Windows).
- **[cMenu](https://github.com/chetachiezikeuzor/cMenu-Plugin)**: When you select text, this plugin opens a small modal of buttons for text formatting and other actions. You can add shell commands to the mix!
- **[Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar)**: Allows you to add new left side menu icons that fire what ever Obsidian command you want - including shell commands!
- **[QuickAdd](https://github.com/chhoumann/quickadd)**: You can create macros that launch multiple commands at once. Sure, in *Shell commands*, you can have multiple terminal commands executed one after another (with `&&` operator for Linux and Mac, and `&` operator for Windows), but *QuickAdd* allows you to have macros that combine shell commands to other Obsidian commands.
- **[Text Expander](https://github.com/konodyuk/obsidian-text-expander)**: If you want to write codeblocks in your markdown note files and execute them, then *Text Expander* is the solution for you. *Shell commands* focuses on bringing short, rarely changed terminal commands at your fingertips via hotkeys. You can run longer scripts with *Shell commands* too by writing them into a bash/batch file and executing that file as a command, but if you need to view the script before executing it, or make changes regularly, then *Shell commands* is not so optimal for your situation, and you might benefit more from *Text Expander*. But of course, you can also have both if you like.

(Thanks [FelipeRearden](https://github.com/FelipeRearden) for telling me about many of these plugins!)

## Tested platforms

Here is a list of operating systems this plugin has been tested on, along with Obsidian version and the plugin's version (= SC, Shell commands).

| Shell commands version | Windows 10 | Linux (Xubuntu 20.04) | Mac |
| ----------------------| ---------- | --------------------- | --- |
| SC 0.15.0 | Obsidian 0.15.9<br>Works | Obsidian 0.15.9<br>Works | |
| SC 0.14.0 | Obsidian 0.15.6<br>Works | Obsidian 0.15.6<br>Works | macOS: Monterey 12.4 (21F79) <br>Obsidian: 0.15.9<br>[Works otherwise but there's a newline bug](https://github.com/Taitava/obsidian-shellcommands/issues/1#issuecomment-1197307219). Tested by [gapmiss](https://github.com/gapmiss), thank you! 🙂 |
| SC 0.13.0 | Obsidian 0.14.15<br>Works | Obsidian 0.14.15<br>Works | |
| SC 0.12.1 | Obsidian 0.14.6<br>Works | Obsidian 0.14.6<br>Works | |
| SC 0.12.0 | Obsidian 0.14.6<br>Works | Obsidian 0.14.6<br>Works | |
| SC 0.11.1 | Obsidian 0.13.23<br>Works | Obsidian 0.13.23<br>Works | |
| SC 0.11.0 | Obsidian 0.13.23<br>Works | Obsidian 0.13.23<br>Works | macOS: 11.6 <br>Obsidian: ?<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.10.0 | Obsidian 0.13.23<br>Works | Obsidian 0.13.23<br>Works | macOS: 11.6 <br>Obsidian: ?<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.9.0 | Obsidian 0.12.19<br>Works | Obsidian 0.12.19<br>Works | |
| SC 0.8.0 | Obsidian 0.12.19<br>Works | Obsidian 0.12.19<br>Works | macOS: 11.6 <br>Obsidian: 0.12.19<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.7.1 | Obsidian 0.12.19<br>Works | Obsidian 0.12.19<br>Works | |
| SC 0.7.0 | Obsidian 0.12.19<br>Works | Obsidian 0.12.19<br>Works | macOS: 11.6 <br>Obsidian: 0.12.19<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.6.1 | Obsidian 0.12.19<br>Works | Obsidian 0.12.19<br>Works | |
| SC 0.6.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.5.1 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.5.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.4.1 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.4.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.3.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.2.0 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | macOS: 11.1 <br>Obsidian: 0.12.15<br>Works, tested by [FelipeRearden](https://github.com/FelipeRearden), thank you! 🙂 |
| SC 0.1.1 | Obsidian 0.12.15<br>Works | Obsidian 0.12.15<br>Works | |
| SC 0.1.0 | Obsidian 0.12.12<br>Works | Obsidian 0.12.12<br>Works | macOS: 11.5.2<br>Obsidian: 0.12.5<br>Works, tested by [skipadu](https://github.com/skipadu), thank you! 🙂 |
| SC 0.0.0 | Obsidian 0.12.12<br>Works | Obsidian 0.12.12<br>Works | |

As I do not own a Mac, tests on Mac are performed by other people, and I cannot guarantee that every version will be tested on Mac. That's the reason why Mac might not appear on every row in the above table. If you notice that the newest SC version does not have a Mac test record in the table, you can help by [performing a Mac test yourself and submitting your freeform test result here](https://github.com/Taitava/obsidian-shellcommands/issues/1).

## Ask for help

If you have any questions about how to use this plugin, please feel free to [open an issue in GitHub](https://github.com/Taitava/obsidian-shellcommands/issues), or [post in the plugin's Obsidian.md forum topic](https://forum.obsidian.md/t/shell-commands-plugin/23497).

## Contributing
Ideas, issues, feedback, pull requests etc. are all welcome! :)
- For feature requests, please start [a new discussion](https://github.com/Taitava/obsidian-shellcommands/discussions) in Ideas category.
- If you're about to create a pull request, please discuss your idea first so that you won't accidentally use your time for something that will be later decided to be implemented in a very different way. There might also be refactorings happening on the codebase, during which time it might be wise to wait until the refactoring is done before creating a PR, otherwise you might base your work on old codebase that will require you to update your PR when the refactoring is finished. So, ask before creating a PR, and I can tell if you should wait or not. :)

## Author

For all authors, see [AUTHORS.md](https://github.com/Taitava/obsidian-shellcommands/blob/main/AUTHORS.md).

### Developer
Jarkko Linnanvirta

Contact:
 - https://github.com/Taitava
 - https://forum.obsidian.md/u/jare/

### Copyright

Copyright (C) 2021 - 2022 Jarkko Linnanvirta (see other authors in [AUTHORS.md](https://github.com/Taitava/obsidian-shellcommands/blob/main/AUTHORS.md)).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

[The full license is available in the GitHub repository of this project](https://github.com/Taitava/obsidian-shellcommands/blob/main/LICENSE).
