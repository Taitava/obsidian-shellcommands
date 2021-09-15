interface ShellCommandVariableInstruction {
    variable_name: string,
    instructions: string,
}

let shell_command_variable_instructions: ShellCommandVariableInstruction[] = [];

export function getShellCommandVariableInstructions() {
    sort_shell_command_variable_instructions(); // Make sure the variables are in correct order.
    return shell_command_variable_instructions;
}

export function addShellCommandVariableInstructions(variable_name: string, instructions: string) {
    shell_command_variable_instructions.push({
        variable_name: variable_name,
        instructions: instructions,
    });
}

/**
 * Sorts shell_command_variable_instructions alphabetically based on variable_name.
 */
function sort_shell_command_variable_instructions() {
    shell_command_variable_instructions.sort((a: ShellCommandVariableInstruction, b: ShellCommandVariableInstruction) => {
        if (a.variable_name < b.variable_name) {
            return -1;
        } else if (a.variable_name > b.variable_name) {
            return 1;
        }
        return 0;
    });
}