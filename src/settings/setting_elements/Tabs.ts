import {setIcon} from "obsidian";

export interface Tab {
    title: string;
    icon: string;
    content_generator: (container_element: HTMLElement) => void;
}

export interface TabStructure {
    header: HTMLElement,
    buttons: {
        [key: string]: HTMLElement,
    }
    contentContainers: {
        [key: string]: HTMLElement,
    },
}

export interface Tabs {
    [key: string]: Tab;
}

interface TabContentContainers {
    [key: string]: HTMLElement,
}

interface TabButtons {
    [key: string]: HTMLElement,
}

export function createTabs(container_element: HTMLElement, tabs: Tabs): TabStructure {
    const tab_header = container_element.createEl("div", {attr: {class: "SC-tab-header"}});
    const tab_content_containers: TabContentContainers = {};
    const tab_buttons: TabButtons = {};
    let first_button: HTMLElement;
    for (let tab_id in tabs) {
        let tab = tabs[tab_id];

        // Create button
        let button = tab_header.createEl("button", {attr: {class: "SC-tab-header-button", activateTab: "SC-tab-" + tab_id}});
        button.onclick = tab_button_clicked;
        setIcon(button, tab.icon);
        button.insertAdjacentText("beforeend", " " + tab.title);
        tab_buttons[tab_id] = button;

        // Create content container
        tab_content_containers[tab_id] = container_element.createEl("div", {attr: {class: "SC-tab-content", id: "SC-tab-" + tab_id}});

        // Generate content
        tab.content_generator(tab_content_containers[tab_id]);

        // Memorize the first tab's button
        if (!first_button) {
            first_button = button;
        }
    }

    // Activate the first tab
    if (first_button) {
        first_button.click();
    }

    // Return a TabStructure
    return {
        header: tab_header,
        buttons: tab_buttons,
        contentContainers: tab_content_containers,
    };
}

function tab_button_clicked(event: MouseEvent) {
    const tab_button = event.target as HTMLElement;

    // Hide all tab contents and get the max height
    let max_height = 0;
    const tab_contents = tab_button.parentElement.parentElement.findAll("div.SC-tab-content"); // Do not get all tab contents that exist, because there might be multiple tab systems open at the same time.
    for (let index in tab_contents) {
        let tab_content = tab_contents[index];

        // Get the maximum tab height so that all tabs can have the same height.
        tab_content.addClass("SC-tab-active"); // Need to make the tab visible temporarily in order to get the height.
        if (tab_content.offsetHeight > max_height) {
            max_height = tab_content.offsetHeight;
        }

        // Finally hide the tab
        tab_content.removeClass("SC-tab-active");
    }

    // Remove active status from all buttons
    const adjacent_tab_buttons = tab_button.parentElement.findAll(".SC-tab-header-button"); // Do not get all tab buttons that exist, because there might be multiple tab systems open at the same time.
    for (let index in adjacent_tab_buttons) {
        let tab_button = adjacent_tab_buttons[index];
        tab_button.removeClass("SC-tab-active");
    }

    // Activate the clicked tab
    tab_button.addClass("SC-tab-active");
    const activate_tab_id = tab_button.attributes.getNamedItem("activateTab").value;
    const tab_content = document.getElementById(activate_tab_id);
    tab_content.addClass("SC-tab-active");

    // Apply the max height to this tab
    tab_content.style.height = max_height+"px";

    // Do nothing else (I don't know if this is needed or not)
    event.preventDefault();
}