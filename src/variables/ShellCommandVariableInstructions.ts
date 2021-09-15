interface ShellCommandVariableInstruction {
    variable_name: string,
    instructions: string,
}

let shell_command_variable_instructions: ShellCommandVariableInstruction[] = [];

export function getShellCommandVariableInstructions() {
    return shell_command_variable_instructions;
}

export function addShellCommandVariableInstructions(variable_name: string, instructions: string) {
    shell_command_variable_instructions.push({
        variable_name: variable_name,
        instructions: instructions,
    })
}