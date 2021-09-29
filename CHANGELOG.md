# Changelog
All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
Features that are in development, but are not released yet. Does not include stuff that requires longer planning - for those, see [Roadmap on GitHub](https://github.com/Taitava/obsidian-shellcommands/projects/1).

### Fixed
- [Variables `{{file_path:absolute}}` / `{{folder_path:absolute}}` missed leading `/`/`\` slash (#44)](https://github.com/Taitava/obsidian-shellcommands/issues/44)
- [Variable `{{folder_path:relative}}` returned `/` when current file is in vault root (#52)](https://github.com/Taitava/obsidian-shellcommands/issues/52)

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

[Unreleased]: https://github.com/Taitava/obsidian-shellcommands/compare/0.4.0...HEAD
[0.4.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.1.1...0.2.0
[0.1.1]: https://github.com/Taitava/obsidian-shellcommands/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/Taitava/obsidian-shellcommands/compare/0.0.0...0.1.0
[0.0.0]: https://github.com/Taitava/obsidian-shellcommands/releases/tag/0.0.0
