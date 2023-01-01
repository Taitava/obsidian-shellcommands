# Changelog
All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
Different types of changes:
 - Added
 - Changed
 - Deprecated
 - Removed
 - Fixed
 - Security
Mind the order!
-->

## [Unreleased]
Features that are in development, but are not released yet. Does not include stuff that requires longer planning - for those, see [Roadmap](https://publish.obsidian.md/shellcommands/Roadmap) and [Ideas](https://github.com/Taitava/obsidian-shellcommands/discussions/categories/ideas).

**VERSION 0.18.0 INCLUDES POSSIBLY BACKWARDS INCOMPATIBLE CHANGES to variables `{{folder_name}}` and `{{event_folder_name}}`, see below.**

### To be Added
 - [Ability to pass variable values to stdin (#283)](https://github.com/Taitava/obsidian-shellcommands/issues/283).
 - [Globally default values for variables (#298)](https://github.com/Taitava/obsidian-shellcommands/issues/298).
 - [New variables: {{yaml_content}} and {{event_yaml_content}} (#267)](https://github.com/Taitava/obsidian-shellcommands/issues/267).
 - [Settings: Add documentation links to the list of {{variables}} (#302)](https://github.com/Taitava/obsidian-shellcommands/issues/302).
 - [Debug: Create a {{newline}} variable (#295)](https://github.com/Taitava/obsidian-shellcommands/issues/295).
   - Only available in debug mode and used for testing.

### To be Changed
 - [Change {{folder_name}} and {{event_folder_name}} to return a dot instead of an empty string when folder is vault root](https://github.com/Taitava/obsidian-shellcommands/issues/304).
   - **Might be backwards incompatible!** Make sure your shell commands that use `{{folder_name}}`/`{{event_folder_name}}` work as expected when the root folder is denoted as a dot `.` instead of an empty text ` ` (like was before).
 - [{{selection}}: Show an error message if nothing is selected (#303)](https://github.com/Taitava/obsidian-shellcommands/issues/303).
   - Before this, the variable gave an empty text. The old behavior can be restored by defining a [default value](https://publish.obsidian.md/shellcommands/Variables/Default+values).
 - [Settings: Hotkey text should not split over multiple lines (#294)](https://github.com/Taitava/obsidian-shellcommands/issues/294).

### To be Fixed
 - [`{{yaml_value}}`: Crash if a queried property has a null value (#277)](https://github.com/Taitava/obsidian-shellcommands/issues/277).
 - [`{{caret_paragraph}}` should be able to have a default value defined (#311)](https://github.com/Taitava/obsidian-shellcommands/issues/311).

## [0.17.0] - 2022-11-26

**SC VERSION `0.17.0` INCREASES THE MINIMUM OBSIDIAN VERSION REQUIREMENT TO `0.16.3` (practically the same as `1.0.0`). Older versions of Obsidian cannot upgrade SC to `0.17.0`.** The requirement raising is done due to [#276](https://github.com/Taitava/obsidian-shellcommands/issues/276) and [#291](https://github.com/Taitava/obsidian-shellcommands/issues/291).

### Added
 - [Real time output handling (#275)](https://github.com/Taitava/obsidian-shellcommands/issues/275).
   - This required switching to another execution method in [Node.js's `child_process` library](https://nodejs.org/api/child_process.html). This affects also the traditional way of executing shell commands, which should not have any visible changes, but bugs can always occur when doing changes.
 - [New variable: {{caret_paragraph}} (#282)](https://github.com/Taitava/obsidian-shellcommands/issues/282).
 - [A button for terminating long running shell commands (#289)](https://github.com/Taitava/obsidian-shellcommands/issues/289).
 - [Add support for `sh` shell if it's system default (#281)](https://github.com/Taitava/obsidian-shellcommands/issues/281).
 - [Output channel _Open files_: Support opening new tabs and windows (#291)](https://github.com/Taitava/obsidian-shellcommands/issues/291).
   - New options: `new-tab` and `new-window`.

### Changed
 - [Fix layout glitches that came via Obsidian 0.16.0 (#264)](https://github.com/Taitava/obsidian-shellcommands/issues/264)
   - Settings: Tried to revert tab system layout to how it was.
   - Modals: Tried to revert width to make them wide again.
   - Even thought the issue title mentions _fixing_, there's actually [just one bug fix](https://github.com/Taitava/obsidian-shellcommands/commit/6f0b290e16c82f6e3fb214c4dc8aaaedabb4fa35), others are _change_ level modifications.
 - [Output channel 'Open files' opens a new pane again when using `new-pane`, not a new _tab_ (#276)](https://github.com/Taitava/obsidian-shellcommands/issues/276).
   - If you want to open a new _tab_, you can use the new `new-tab` option (listed under _Added_).

### Fixed
 - [Fix: Ask after execution: 'Redirect' repeated output wrapping (#278)](https://github.com/Taitava/obsidian-shellcommands/issues/278).

## [0.16.0] - 2022-09-25

### Added
- [Output wrappers (#262)](https://github.com/Taitava/obsidian-shellcommands/issues/262).
- [Show a notification when executing shell commands (#261)](https://github.com/Taitava/obsidian-shellcommands/issues/261).
- New variables:
  - [{{file_content}} / {{event_file_content}} (#266)](https://github.com/Taitava/obsidian-shellcommands/issues/266)
  - [{{note_content}} / {{event_note_content}} (#77)](https://github.com/Taitava/obsidian-shellcommands/issues/77)
- [Show an error message if a shell command is too long to execute (#269)](https://github.com/Taitava/obsidian-shellcommands/issues/269).

### Changed
- [Internal: Refactor variable parsing to become asynchronous (#265)](https://github.com/Taitava/obsidian-shellcommands/issues/265).
  - Should not cause any visible changes per se, but allows creating certain new variables that are dependent on asynchronous Obsidian API methods, such as the above-mentioned `{{note_content}}`.

## [0.15.0] - 2022-08-20

### Added
- [New variables: {{file_uri}} and {{event_file_uri}} (#258)](https://github.com/Taitava/obsidian-shellcommands/issues/258).
- [Settings: Add a search field for shell commands (#246)](https://github.com/Taitava/obsidian-shellcommands/issues/246).

### Changed
- [New shell commands will have alphanumeric ids instead of numeric (#253)](https://github.com/Taitava/obsidian-shellcommands/issues/253).
- [Output channel 'Open file' supports opening multiple files (#255)](https://github.com/Taitava/obsidian-shellcommands/issues/255).
- [Autocomplete: sort items more intelligently (#249)](https://github.com/Taitava/obsidian-shellcommands/issues/249).

### Fixed
- [Fix: Scroll position is not always remembered in settings (#245)](https://github.com/Taitava/obsidian-shellcommands/issues/245).

## [0.14.0] - 2022-07-22

**SC VERSION `0.14.0` INCREASES THE MINIMUM OBSIDIAN VERSION REQUIREMENT TO `0.15.4`. Older versions of Obsidian cannot upgrade SC to `0.14.0`. Read more below.**

### Added
- [New variables: `{{new_note_folder_name}}` and `{{new_note_folder_path}}` (#235)](https://github.com/Taitava/obsidian-shellcommands/issues/235).
- [Menu icons for shell commands (#240)](https://github.com/Taitava/obsidian-shellcommands/issues/240).
   - In order to support a wider range of icons, the SC plugin's minimum required version of Obsidian is raised from `0.12.12` to `0.15.4`. In theory, I could have raised the requirement only to `0.13.27`, but I thought that when increasing it once, let's increase to the newest API version, so that future development maybe does not need to increase it soon again. :)
- [Settings: Extra options modal: Add hotkeys to switch between shell commands (#243)](https://github.com/Taitava/obsidian-shellcommands/issues/243).
- [Settings: 'Execute now' button: Ctrl/Cmd + click to temporarily direct output to the 'Ask after execution' modal (#241)](https://github.com/Taitava/obsidian-shellcommands/issues/241).
- [Settings: Display a text when no shell commands exist (#231)](https://github.com/Taitava/obsidian-shellcommands/issues/231).

### Changed
- [Improve an error message when a shell command does not exist for the current OS (but exist for some other OS) (#239)](https://github.com/Taitava/obsidian-shellcommands/issues/239).
- [Internal: Miscellaneous updates from Obsidian Sample plugin (#196)](https://github.com/Taitava/obsidian-shellcommands/issues/196).
- [Internal: Use ESLint to improve code readability (#242)](https://github.com/Taitava/obsidian-shellcommands/issues/242).

## [0.13.0] - 2022-06-28
### Added:
- [New events (#218)](https://github.com/Taitava/obsidian-shellcommands/issues/218):
   - File content modified
   - File created
   - File deleted
   - File moved
   - File renamed
   - Folder created
   - Folder deleted
   - Folder moved
   - Folder renamed
- [Execute shell commands via Obsidian URI (#202)](https://github.com/Taitava/obsidian-shellcommands/issues/202).
- [Settings: Add directories to the `PATH` environment variable (#204)](https://github.com/Taitava/obsidian-shellcommands/issues/204).
- [Modals, such as prompts, can now be approved by pressing enter (#216)](https://github.com/Taitava/obsidian-shellcommands/issues/216).
   - The feature can be turned off via a [hidden setting](https://publish.obsidian.md/shellcommands/Hidden+settings) to prevent accidental executions/deletions etc, but it's on by default.
- [Settings: Add a shortcut icon for defining hotkeys (#210)](https://github.com/Taitava/obsidian-shellcommands/issues/210).
   - From now on, hotkeys are not displayed for shell commands that are completely _excluded_ from Obsidian's command palette (even if a shell command had hotkeys defined before it was configured as _excluded_ from the command palette).
- [Settings: Display shell command id in extra options modal (#205)](https://github.com/Taitava/obsidian-shellcommands/issues/205).

### Changed:
 - [Multiple lines are now supported in shell command fields (#203)](https://github.com/Taitava/obsidian-shellcommands/issues/203).

## [0.12.1] - 2022-05-16

### Fixed:
 - [Bug: Autocomplete menu caused some unintended console logging (#223)](https://github.com/Taitava/obsidian-shellcommands/issues/223). 
 - [Bug: {{event_yaml_value}} gives wrong error message when the wanted property is not found (#220)](https://github.com/Taitava/obsidian-shellcommands/issues/220).

## [0.12.0] - 2022-05-07

### Added
 - [A modal for asking values from user (= prompt) (#37)](https://github.com/Taitava/obsidian-shellcommands/issues/37).
 - [Custom variables, part 1 (#159)](https://github.com/Taitava/obsidian-shellcommands/issues/159): Used to store inputted values from prompts.
 - [Default values for variables (#190)](https://github.com/Taitava/obsidian-shellcommands/issues/190): If a variable cannot be accessed at a given moment, another value can be used instead.
 - [Hotkeys for output channel: Ask after execution (#145)](https://github.com/Taitava/obsidian-shellcommands/issues/145).
 - [Add autocomplete menu to Alias field (#182)](https://github.com/Taitava/obsidian-shellcommands/issues/182).

### Changed
 - Settings: _Operating systems & shells_ tab names are shortened to _Environments_ ([#37](https://github.com/Taitava/obsidian-shellcommands/issues/37) / [commit 55e5de2b](https://github.com/Taitava/obsidian-shellcommands/commit/55e5de2b6774645883e8dd0cfa759f8e1c70f813)).
 - [Internal: Variable refactorings (#178)](https://github.com/Taitava/obsidian-shellcommands/issues/178).

### Fixed
 - [Bug: Output channel 'Open a file' causes an error in the console log if the file cannot be opened (#176)](https://github.com/Taitava/obsidian-shellcommands/issues/176).
   - This same issue also fixes autocomplete to be able to display an error message if a custom help text cannot be read at startup due to incorrect datatype in `autocomplete.yaml`.
 - [Bug: An empty argument in {{yaml_value}}/{{event_yaml_value}} causes a crash (#181)](https://github.com/Taitava/obsidian-shellcommands/issues/181).

## [0.11.1] - 2022-03-05

### Fixed
 - [Bug: Variable escaping corrupts four-byte unicode characters, e.g. emojis (#171)](https://github.com/Taitava/obsidian-shellcommands/issues/171).
 - [Bug: Content in 'Ask after execution' modal is some times clipped off (#172)](https://github.com/Taitava/obsidian-shellcommands/issues/172).

## [0.11.0] - 2022-02-26

### Added
 - [Output channel: Open a file (#143)](https://github.com/Taitava/obsidian-shellcommands/issues/143).
 - [Command palette: An ability to edit the "Execute: " prefix text (#164)](https://github.com/Taitava/obsidian-shellcommands/issues/164).
 - [ A global option to disable all Events (#163)](https://github.com/Taitava/obsidian-shellcommands/issues/163).

### Changed
 - [Internal: Miscellaneous refactorings (#133)](https://github.com/Taitava/obsidian-shellcommands/issues/133). E.g. shortened some CSS class names.
 - [Output channel _Ask after execution_: If some text is selected, use the selected text instead of the whole text (#158)](https://github.com/Taitava/obsidian-shellcommands/issues/158).

### Fixed
- [Fix a latent bug when parsing arguments in variables (#152)](https://github.com/Taitava/obsidian-shellcommands/issues/152).
- [Bug: Ghost shell commands are executed by events even after removal (#165)](https://github.com/Taitava/obsidian-shellcommands/issues/165).

## [0.10.0] - 2022-02-06

### Added
- [Events: Execute shell commands automatically when something happens (#123)](https://github.com/Taitava/obsidian-shellcommands/issues/123).
- [Output channel: Ask after execution (#134)](https://github.com/Taitava/obsidian-shellcommands/issues/134): Allows to direct shell command output to a modal where it can be edited and manually redirected to other channels, i.e. to clipboard, file or status bar.
- [Ability to hide shell commands from the command palette (#125)](https://github.com/Taitava/obsidian-shellcommands/issues/125)
- [Settings: Add availability information to the list of variables (#132)](https://github.com/Taitava/obsidian-shellcommands/issues/132).

### Changed
- [Internal: Cleaner caching for preparsed shell commands (#135)](https://github.com/Taitava/obsidian-shellcommands/issues/135).

### Fixed
- [Fix automatically focusing on Alias field when opening the extra options modal (#144)](https://github.com/Taitava/obsidian-shellcommands/issues/144).

## [0.9.0] - 2021-12-18

### Added

- [`{{caret_position}}` variable (#119)](https://github.com/Taitava/obsidian-shellcommands/issues/119). Thank you [vrajur](https://github.com/vrajur) for this contribution!
- [`{{yaml_value}}` variable (#120)](https://github.com/Taitava/obsidian-shellcommands/issues/120).
- [`{{file_extension}}` variable (#122)](https://github.com/Taitava/obsidian-shellcommands/issues/122).

### Changed
- [Output to status bar: Don't ignore empty output (#124)](https://github.com/Taitava/obsidian-shellcommands/issues/124).

### Fixed
- [Fix: Autocomplete suggests variables when typing right after a closing }} pair (#129)](https://github.com/Taitava/obsidian-shellcommands/issues/129).

## [0.8.0] - 2021-12-10

### Added
- [Autocompletion menu for variables in shell command fields (#33)](https://github.com/Taitava/obsidian-shellcommands/issues/33): When typing `{{` in a shell command field, a dropdown menu will open up, suggesting variables that match the input after `{{`. Variable help texts are also displayed. Extra: custom suggestions can be defined in an optional `autocomplete.yaml` file in the plugin's folder. It can contain e.g. all commands supported by a certain shell. [Documentation for autocomplete](https://publish.obsidian.md/shellcommands/Variables/Autocomplete/Autocomplete). The autocomplete feature is powered by [kraaden/autocomplete](https://github.com/kraaden/autocomplete). Thank you [FelipeRearden](https://github.com/FelipeRearden) for this idea!
- [Show SC version number in settings, and a link to the changelog (#112)](https://github.com/Taitava/obsidian-shellcommands/issues/112).

### Changed
- [Settings: Variables are now located on their own tab (#110)](https://github.com/Taitava/obsidian-shellcommands/issues/110).
- [Support ignoring error code 0 (#107)](https://github.com/Taitava/obsidian-shellcommands/issues/107)
- [Internal: Save new main settings fields to file already during loading (#111)](https://github.com/Taitava/obsidian-shellcommands/issues/111).

## [0.7.1] - 2021-12-05

### Fixed
- [Fixed: When an incompatible settings file is encountered, the plugin is unable to disable itself (#113)](https://github.com/Taitava/obsidian-shellcommands/issues/113).

## [0.7.0] - 2021-11-25

**VERSION 0.7.0 INCLUDES POSSIBLY BACKWARDS INCOMPATIBLE CHANGES, see below.**

### Added
- [An ability to select a shell that will be used for execution, and operating system specific versions of shell commands (#76)](https://github.com/Taitava/obsidian-shellcommands/issues/76).
- [Internal: Store plugin version in the settings file (#90)](https://github.com/Taitava/obsidian-shellcommands/issues/90)
- [Settings file will be backed up before any new migrations (#83)](https://github.com/Taitava/obsidian-shellcommands/issues/83).
- [A documentation vault in Obsidian Publish (#100)](https://github.com/Taitava/obsidian-shellcommands/issues/100). Here's the link: https://publish.obsidian.md/shellcommands

### Changed
- **Possibly backwards incompatible change:** [{{Variable}} values are escaped when using PowerShell or Bash (#11)](https://github.com/Taitava/obsidian-shellcommands/issues/11). Check that your variables work correctly after this upgrade! Add an exclamation mark `!` in front of the variable name if you need to use unescaped variable values, e.g. `{{!file_name}}`.
- **Possibly backwards incompatible change:** [Only the following shells will be supported: Bash, Dash, Zsh, Windows CMD, PowerShell 5 and PowerShell Core (#76)](https://github.com/Taitava/obsidian-shellcommands/issues/76). While SC now supports changing the shell in settings, it needs to be noted that if your operating system's user preferences are defined to use some other shell than those listed before, SC will no longer allow executing commands, because it will not know how to escape special characters for a shell that is unknown to it. This limitation will be removed later, [when support for different shells gets improved](https://github.com/Taitava/obsidian-shellcommands/issues/108).
- [Linux and Mac: User's default shell will be used instead of /bin/sh (#76)](#76). SC versions prior to 0.7.0 used `/bin/sh` as a shell on Linux and Mac (`/bin/sh` came as a default value from [Node.js's](https://nodejs.org/en/) [child_process](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback)). `0.7.0` changes this so that the default shell is retrieved from the current user's `$SHELL` environment variable. On Windows, default shell is retrieved from `COMSPEC` environment variable, and this has not changed. These are only defaults, and a user can change these shells in settings. If a shell has changed for you, your shell commands might run a bit differently after this upgrade.
- Settings: Split settings content to tabs ([#78](https://github.com/Taitava/obsidian-shellcommands/issues/78) and [#85](https://github.com/Taitava/obsidian-shellcommands/issues/85)).
- [Settings: Clipboard output channel notification balloon can be turned off (#75)](https://github.com/Taitava/obsidian-shellcommands/issues/75).
- [Settings: Make extra options modal scrollable (#84)](https://github.com/Taitava/obsidian-shellcommands/issues/84)
- Internal: Old `commands` field in *data.json* settings file is completely removed if it's empty, because it hasn't been used as of 0.1.1.
- [Internal: The plugin will not spam hidden console.log() messages anymore, unless a debug option is turned on (#69)](https://github.com/Taitava/obsidian-shellcommands/issues/69).

### Fixed
- [Settings migrations: Small fix for doing multiple migrations at once (no issue)](https://github.com/Taitava/obsidian-shellcommands/commit/e77c65744cbf9445c0a0761c802ecea3744d6323).

## [0.6.1] - 2021-11-02

### Fixed

- [Dollar sign in variable value may cause part of the command to be repeated in the variable value (#94)](https://github.com/Taitava/obsidian-shellcommands/issues/94)

## [0.6.0] - 2021-10-12

### Added
- [New shell command output channels (#68)](https://github.com/Taitava/obsidian-shellcommands/issues/68):
  - Status bar: Good for showing short outputs in a permanent place.
  - Current file, top: Puts the output at the very beginning of a file.
  - Current file, bottom: Puts the output at the very end of a file.
  - Clipboard: So that you can easily paste the output anywhere you like.

### Changed
- [Settings: Scroll position is now remembered (#71)](https://github.com/Taitava/obsidian-shellcommands/issues/71)
- [`{{tags}}` does not include preceding hash (#) characters anymore (#62)](https://github.com/Taitava/obsidian-shellcommands/issues/62). This is a backwards incompatible change (although a small one), and normally these kinds of changes would not be released in a _minor_ version update. But this plugin is still in its 0.x era, so breaking changes are tolerated more than in stable releases. If you want to have your tags prefixed with a hash again, use something like `#{{tags:,#}}` instead of `{{tags:,}}`.
- [Internal: Support multiple parameters for variables (#43)](https://github.com/Taitava/obsidian-shellcommands/issues/43). In the future, allows developing new variables that takes multiple arguments, and/or optional arguments.
- `{{file_path}}` and `{{folder_path}}` will not give an error message anymore if the given argument is not *relative* or *absolute*. Instead, the variable will be left unparsed silently. This change happened during [#43](https://github.com/Taitava/obsidian-shellcommands/issues/43).

## [0.5.1] - 2021-10-09

### Fixed
- [`{{tags}}` does not give duplicate tags anymore (#65)](https://github.com/Taitava/obsidian-shellcommands/issues/65).
- [Error balloon: Exit code was sometimes null (#67)](https://github.com/Taitava/obsidian-shellcommands/issues/67).

## [0.5.0] - 2021-10-02

### Added
- [Shell command output can now be accessed in various ways (#34)](https://github.com/Taitava/obsidian-shellcommands/issues/34):
  - Output can be directed to a chosen channel: a notification balloon, or to currently open note file at caret position, possibly replacing a selection.
  - Output can also be ignored = not displayed anywhere.
  - Separate output channels can be defined for each output stream: stdout and stderr.
  - Output channel definitions can be altered separately for each shell command.
  - Previously stdout was always ignored, and stderr could only be directed into a notification balloon.
- [A setting for how long to display notifications (#58)](https://github.com/Taitava/obsidian-shellcommands/issues/58). Mainly affects when shell command output is directed to a _notification balloon_.
- [A new variable {{tags}}(#51)](https://github.com/Taitava/obsidian-shellcommands/issues/51) (Thank you [FelipeRearden](https://github.com/FelipeRearden) for this idea!)

### Changed
- Error messages do not contain the failed shell command anymore, only exit code number and the actual error message (stderr). This is due to error message simplification that had to be done when implementing new ways to use outputs, including stderr in issue #34.

## [0.4.1] - 2021-09-29

### Fixed
- [Variables `{{file_path:absolute}}` / `{{folder_path:absolute}}` missed leading `/`/`\` slash (#44)](https://github.com/Taitava/obsidian-shellcommands/issues/44)
- [Variable `{{folder_path:relative}}` returned `/` when current file is in vault root (#52)](https://github.com/Taitava/obsidian-shellcommands/issues/52)
- [Turning off 'Preview variables' setting left old previews to command palette (#45)](https://github.com/Taitava/obsidian-shellcommands/issues/45)
- [Entering an alias for a new, empty command did not update the command title in settings (#46)](https://github.com/Taitava/obsidian-shellcommands/issues/46)
- [Prevent executing empty shell commands (#53)](https://github.com/Taitava/obsidian-shellcommands/issues/53)

## [0.4.0] - 2021-09-26

### Added
- [Confirmation before executing a shell command (#35)](https://github.com/Taitava/obsidian-shellcommands/issues/35)
- [Settings: Execute now icon button for each command (#30)](https://github.com/Taitava/obsidian-shellcommands/issues/30)
- [Ignore errors by code (#36)](https://github.com/Taitava/obsidian-shellcommands/issues/36): You can choose not to display error messages for certain exit codes. 

### Changed
- [Working directory: support a relative path (#28)](https://github.com/Taitava/obsidian-shellcommands/issues/28)
- [Internal: Make variables to return error messages in an array, not to display error messages directly (#39)](https://github.com/Taitava/obsidian-shellcommands/issues/39)
- The above internal change also made these changes:
  - Settings: command preview can now show error messages from variables.
  - If one variable fails to parse, parsing the rests of variables is cancelled, so in some cases less error messages are displayed at the same time.

## [0.3.0] - 2021-09-17

### Added
- [{{workspace}} variable (#14)](https://github.com/Taitava/obsidian-shellcommands/issues/14) (Thank you [FelipeRearden](https://github.com/FelipeRearden) for this idea!)
- [Settings: Display hotkeys next to commands. (#21)](https://github.com/Taitava/obsidian-shellcommands/issues/21)

### Changed
- [Settings: Widen the command fields. (#19)](https://github.com/Taitava/obsidian-shellcommands/issues/19)
- [Settings: Shell commands are now deleted with an icon button, not by clearing a text field. (#20)](https://github.com/Taitava/obsidian-shellcommands/issues/20)
- Settings: When opening alias modal, the alias text field has now focus.
- Internal restructuring of code without external implications.
- Small improvement on descriptions of {{file_name}} and {{title}} in the plugin's settings.

## [0.2.0] - 2021-09-11

### Added
- [Alias names for commands (#6)](https://github.com/Taitava/obsidian-shellcommands/issues/6) (Thank you [FelipeRearden](https://github.com/FelipeRearden) for this idea!)
- [Preview variables in command palette (#10)](https://github.com/Taitava/obsidian-shellcommands/issues/10)
- [A setting for how long to display error messages (#7)](https://github.com/Taitava/obsidian-shellcommands/issues/7)

## [0.1.1] - 2021-09-10

### Changed
- [Internal rewriting of how command settings are stored (#8)](https://github.com/Taitava/obsidian-shellcommands/issues/8)
- Settings: Changing or creating commands does not require pressing Apply button anymore. Apply is still needed after removing commands.

### Deprecated
- [`commands` configuration setting (#8)](https://github.com/Taitava/obsidian-shellcommands/issues/8): Version `0.1.1` (and above) will replace this setting in users' `data.json` settings file with a new `shell_commands` setting. This is an internal change, and the plugin will handle it automatically, but it's important to be noted by end users, because users need to upgrade to `0.1.1` (or newer) *before* upgrading to `1.0.0` in the future, because [`1.0.0` will finally remove the migration support for `commands` setting (#9)](https://github.com/Taitava/obsidian-shellcommands/issues/9). That being said, `1.0.0` is not going to be released any time soon, it's just a milestone in the far future (at the time of writing this on 2021-09-09).

### Fixed
- Deleting commands should not cause non-removed commands to change/lose their hotkeys.

## [0.1.0] - 2021-08-29

### Added
- Support for certain in-built variables (see the settings panel - actually I should put the variables to the README.md file too at some point).
- Display execution errors.
- README.md: Usage examples.

### Changed
- Determine vault directory automatically.
- A bit better behaving settings view.

## [0.0.0] - 2021-08-22
- Initial release.

[Unreleased]: https://github.com/Taitava/obsidian-shellcommands/compare/0.17.0...HEAD
[0.17.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.16.0...0.17.0
[0.16.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.15.0...0.16.0
[0.15.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.14.0...0.15.0
[0.14.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.13.0...0.14.0
[0.13.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.12.1...0.13.0
[0.12.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.12.0...0.12.1
[0.12.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.11.1...0.12.0
[0.11.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.11.0...0.11.1
[0.11.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.10.0...0.11.0
[0.10.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.9.0...0.10.0
[0.9.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.7.1...0.8.0
[0.7.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.7.0...0.7.1
[0.7.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.6.1...0.7.0
[0.6.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.6.0...0.6.1
[0.6.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.5.1...0.6.0
[0.5.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.5.0...0.5.1
[0.5.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.4.1...0.5.0
[0.4.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.0.0...0.1.0
[0.0.0]: https://github.com/Taitava/obsidian-shellcommands/releases/tag/0.0.0
